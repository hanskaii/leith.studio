export type FitMode = "fill" | "contain" | "cover";
export type Rotation = 0 | 90 | 180 | 270;
export type VideoCodec = "avc" | "hevc" | "vp9" | "av1" | "vp8";
export type AudioCodec =
	| "aac"
	| "opus"
	| "mp3"
	| "vorbis"
	| "flac"
	| "ac3"
	| "eac3";
export type QualityLevel = "very-low" | "low" | "medium" | "high" | "very-high";
export type OutputFormat =
	| "mp4"
	| "webm"
	| "mkv"
	| "mov"
	| "mp3"
	| "wav"
	| "ogg"
	| "mpegts";

export type WatermarkPosition =
	| "top-left"
	| "top-right"
	| "bottom-left"
	| "bottom-right"
	| "center";

export type Transform =
	// --- Video spatial ---
	| { type: "resize"; width?: number; height?: number; fit?: FitMode }
	| { type: "rotate"; degrees: Rotation }
	| { type: "crop"; left: number; top: number; width: number; height: number }
	// --- Video temporal ---
	| { type: "clip"; startSeconds?: number; durationSeconds: number }
	// --- Video encode ---
	| { type: "framerate"; fps: number }
	| {
			type: "video-codec";
			codec: VideoCodec;
			bitrate?: number | QualityLevel;
	  }
	| { type: "strip-video" }
	// --- Video presets (run via video.process) ---
	| {
			type: "watermark";
			imagePath: string;
			position?: WatermarkPosition;
			opacity?: number;
	  }
	| {
			type: "color-filter";
			brightness?: number;
			contrast?: number;
			saturation?: number;
	  }
	// --- Audio ---
	| { type: "audio-channels"; count: number }
	| { type: "audio-samplerate"; hz: number }
	| {
			type: "audio-codec";
			codec: AudioCodec;
			bitrate?: number | QualityLevel;
	  }
	| { type: "strip-audio" }
	// --- Audio presets (run via audio.process) ---
	| { type: "volume"; gain: number };

export interface ProcessItem {
	inputPath: string;
	outputPath: string;
	pipeline: Transform[];
	outputFormat?: OutputFormat;
}

export interface TransformResult {
	buffer: ArrayBuffer;
	format: OutputFormat;
}
