// ─── Types ───────────────────────────────────────────────────────────────────

export type GenerationStatus = "queued" | "processing" | "completed" | "failed";

export type ImageModel =
	| "nano-banana"
	| "nano-banana-2"
	| "nano-banana-pro"
	| "qwen-image"
	| "seedream-4.0"
	| "seedream-4.5"
	| "seedream-5.0-lite"
	| "kling-3.0"
	| "kling-o3"
	| "gpt-image-2.0";

export type ImageAspectRatio =
	| "16:9"
	| "4:3"
	| "1:1"
	| "3:4"
	| "9:16"
	| "3:2"
	| "2:3"
	| "21:9"
	| "1:2"
	| "2:1"
	| "landscape"
	| "portrait"
	| "square";

export type ImageQuality =
	| "512p"
	| "720p"
	| "1080p"
	| "1440p"
	| "1800p"
	| "2160p";

export type VideoModel =
	| "veo-3.1-fast"
	| "veo-3.1-quality"
	| "veo-3.1-lite"
	| "v6"
	| "v5.6"
	| "v5.5"
	| "v5"
	| "v5-fast"
	| "pixverse-c1"
	| "seedance-2.0"
	| "seedance-2.0-fast"
	| "kling-o3"
	| "kling-v3"
	| "grok-imagine"
	| "sora-2"
	| "sora-2-pro"
	| "happyhorse-1.0";

export type VideoMode = "t2v" | "i2v" | "i2v-fl" | "r2v";

export type VideoAspectRatio =
	| "landscape"
	| "portrait"
	| "16:9"
	| "9:16"
	| "1:1"
	| "4:3"
	| "3:4";

export type VideoQuality = "480p" | "720p" | "1080p";

export type MotionControlQuality = "360p" | "540p" | "720p";

export type SpeechEmotion = "neutral" | "happy" | "sad" | "angry";

// ─── Request shapes ───────────────────────────────────────────────────────────

export interface GenerateImageParams {
	prompt: string;
	model?: ImageModel;
	quality?: ImageQuality;
	aspect_ratio?: ImageAspectRatio;
	count?: number;
	reference_asset_ids?: number[];
	upscalable?: boolean;
}

export interface GenerateVideoParams {
	prompt: string;
	mode?: VideoMode;
	model?: VideoModel;
	aspect_ratio?: VideoAspectRatio;
	count?: number;
	quality?: VideoQuality;
	duration?: number;
	off_peak?: boolean;
	start_frame_asset_id?: number;
	end_frame_asset_id?: number;
	reference_asset_ids?: number[];
}

export interface ExtendVideoParams {
	prompt: string;
}

export interface MotionControlParams {
	character_asset_id: number;
	motion_video_asset_id: number;
	quality: MotionControlQuality;
	off_peak?: boolean;
}

export interface GenerateSpeechParams {
	text: string;
	speaker_id: string;
	speed?: number;
	emotion?: SpeechEmotion;
}

export interface ListAssetsParams {
	page?: number;
	limit?: number;
}

export interface ListGenerationsParams {
	page?: number;
	limit?: number;
}

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface GenerateImageResponse {
	generation_ids: number[];
	status: GenerationStatus;
	credits_charged: number;
	estimated_seconds: number;
}

export interface GenerateVideoResponse {
	generation_ids: number[];
	status: GenerationStatus;
	credits_charged: number;
	estimated_seconds: number;
}

export interface ExtendVideoResponse {
	generation_id: number;
	status: GenerationStatus;
	credits_charged: number;
	estimated_seconds: number;
}

export interface MotionControlResponse {
	generation_id: number;
	status: GenerationStatus;
	credits_charged: number;
	estimated_seconds: number;
}

export interface UpscaleResponse {
	generation_id: number;
	status: GenerationStatus;
	credits_charged: number;
	estimated_seconds: number;
}

export interface GenerateSpeechResponse {
	generation_id: number;
	status: "completed";
	asset_url: string;
	duration: number;
	credits_charged: number;
}

export interface Asset {
	asset_id: number;
	content_type: string;
	url: string;
	created_at: string;
}

export interface UploadAssetResponse extends Asset {}

export interface ListAssetsResponse {
	assets: Asset[];
	total: number;
	page: number;
	limit: number;
}

export interface Generation {
	id: number;
	type: string;
	model: string;
	prompt: string;
	status: GenerationStatus;
	asset_url: string | null;
	asset_key: string | null;
	credits_charged: number;
	error_message: string | null;
	expires_at: string;
	created_at: string;
}

export interface ListGenerationsResponse {
	generations: Generation[];
	total: number;
	page: number;
	limit: number;
}

export interface AccountCredits {
	plan_credits: number;
	topup_credits: number;
	total_credits: number;
	plan_tier: string;
}

// ─── Error ────────────────────────────────────────────────────────────────────

export class VioError extends Error {
	constructor(
		public readonly code: string,
		message: string,
		public readonly httpStatus: number
	) {
		super(message);
		this.name = "VioError";
	}
}

// ─── Service ──────────────────────────────────────────────────────────────────

const BASE = "https://api.viostudio.id/v1";

export class VioService {
	constructor(private readonly apiKey: string) {}

	// ── Core fetch ────────────────────────────────────────────────────────────

	private async request<T>(
		method: string,
		path: string,
		body?: unknown
	): Promise<T> {
		const res = await fetch(`${BASE}${path}`, {
			method,
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				...(body !== undefined
					? { "Content-Type": "application/json" }
					: {})
			},
			...(body !== undefined ? { body: JSON.stringify(body) } : {})
		});

		if (res.status === 204) return undefined as T;

		const json = (await res.json()) as any;

		if (!res.ok) {
			const code = json?.error?.code ?? "UNKNOWN_ERROR";
			const message = json?.error?.message ?? res.statusText;
			throw new VioError(code, message, res.status);
		}

		return json as T;
	}

	private async upload<T>(path: string, file: File | Blob): Promise<T> {
		const form = new FormData();
		form.append("file", file);

		const res = await fetch(`${BASE}${path}`, {
			method: "POST",
			headers: { Authorization: `Bearer ${this.apiKey}` },
			body: form
		});

		const json = (await res.json()) as any;

		if (!res.ok) {
			const code = json?.error?.code ?? "UNKNOWN_ERROR";
			const message = json?.error?.message ?? res.statusText;
			throw new VioError(code, message, res.status);
		}

		return json as T;
	}

	// ── Images ────────────────────────────────────────────────────────────────

	generateImage(params: GenerateImageParams): Promise<GenerateImageResponse> {
		return this.request("POST", "/images/generate", params);
	}

	upscaleImage(generationId: number): Promise<UpscaleResponse> {
		return this.request("POST", `/images/${generationId}/upscale`);
	}

	// ── Videos ────────────────────────────────────────────────────────────────

	generateVideo(params: GenerateVideoParams): Promise<GenerateVideoResponse> {
		return this.request("POST", "/videos/generate", params);
	}

	extendVideo(
		generationId: number,
		params: ExtendVideoParams
	): Promise<ExtendVideoResponse> {
		return this.request("POST", `/videos/${generationId}/extend`, params);
	}

	motionControl(params: MotionControlParams): Promise<MotionControlResponse> {
		return this.request("POST", "/videos/motion-control", params);
	}

	upscaleVideo(generationId: number): Promise<UpscaleResponse> {
		return this.request("POST", `/videos/${generationId}/upscale`);
	}

	// ── Speech ────────────────────────────────────────────────────────────────

	generateSpeech(
		params: GenerateSpeechParams
	): Promise<GenerateSpeechResponse> {
		return this.request("POST", "/audio/speech", params);
	}

	// ── Assets ────────────────────────────────────────────────────────────────

	uploadAsset(file: File | Blob): Promise<UploadAssetResponse> {
		return this.upload("/assets", file);
	}

	listAssets(params: ListAssetsParams = {}): Promise<ListAssetsResponse> {
		const qs = new URLSearchParams();
		if (params.page) qs.set("page", String(params.page));
		if (params.limit) qs.set("limit", String(params.limit));
		const query = qs.toString();
		return this.request("GET", `/assets${query ? `?${query}` : ""}`);
	}

	deleteAsset(assetId: number): Promise<void> {
		return this.request("DELETE", `/assets/${assetId}`);
	}

	// ── Generations ───────────────────────────────────────────────────────────

	getGeneration(id: number): Promise<Generation> {
		return this.request("GET", `/generations/${id}`);
	}

	listGenerations(
		params: ListGenerationsParams = {}
	): Promise<ListGenerationsResponse> {
		const qs = new URLSearchParams();
		if (params.page) qs.set("page", String(params.page));
		if (params.limit) qs.set("limit", String(params.limit));
		const query = qs.toString();
		return this.request("GET", `/generations${query ? `?${query}` : ""}`);
	}

	// ── Account ───────────────────────────────────────────────────────────────

	getCredits(): Promise<AccountCredits> {
		return this.request("GET", "/account/credits");
	}

	// ── Polling helper ────────────────────────────────────────────────────────

	/**
	 * Poll a generation until completed or failed.
	 * Strategy: 1s for first 10s, 5s until 60s, 10s after — timeout 10min.
	 */
	async pollGeneration(
		id: number,
		onProgress?: (gen: Generation) => void
	): Promise<Generation> {
		const start = Date.now();
		const TIMEOUT = 10 * 60 * 1000;

		let elapsed = 0;

		while (elapsed < TIMEOUT) {
			const gen = await this.getGeneration(id);

			onProgress?.(gen);

			if (gen.status === "completed" || gen.status === "failed")
				return gen;

			elapsed = Date.now() - start;
			const delay =
				elapsed < 10_000 ? 1000 : elapsed < 60_000 ? 5000 : 10_000;

			await new Promise((r) => setTimeout(r, delay));
			elapsed = Date.now() - start;
		}

		throw new VioError(
			"TIMEOUT",
			`Generation ${id} did not complete within 10 minutes`,
			408
		);
	}
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createVioService(env: { VIO_API_KEY: string }): VioService {
	return new VioService(env.VIO_API_KEY);
}
