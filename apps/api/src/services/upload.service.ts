import { database, eq } from "@workspace/database";
import type { HonoEnv } from "../types/hono.types";
import * as schema from "@workspace/database/schema";
import { Day } from "@workspace/core";
import {
	PhotonImage,
	SamplingFilter,
	resize,
	crop
} from "@cf-wasm/photon/workerd";

const ALLOWED_TYPES: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/gif": "gif",
	"image/webp": "webp",
	"image/avif": "avif"
};

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const THUMB_MAX_WIDTH = 800;
const AVATAR_THUMB_SIZE = 256;

export class UploadService {
	private get db() {
		return database(this.env.DATABASE);
	}

	constructor(private readonly env: HonoEnv["Bindings"]) {}

	/**
	 * Generate a resized WebP thumbnail with max width, preserving aspect ratio.
	 */
	private generateThumb(buffer: ArrayBuffer, maxWidth: number): Uint8Array {
		const inputBytes = new Uint8Array(buffer);
		const image = PhotonImage.new_from_byteslice(inputBytes);

		try {
			const origWidth = image.get_width();
			const origHeight = image.get_height();

			if (origWidth <= maxWidth) {
				// Already within bounds — just encode as WebP
				return image.get_bytes_webp();
			}

			const ratio = maxWidth / origWidth;
			const newHeight = Math.round(origHeight * ratio);

			const resized = resize(
				image,
				maxWidth,
				newHeight,
				SamplingFilter.Lanczos3
			);
			try {
				return resized.get_bytes_webp();
			} finally {
				resized.free();
			}
		} finally {
			image.free();
		}
	}

	/**
	 * Generate a square center-crop WebP thumbnail (size × size).
	 */
	private generateSquareThumb(buffer: ArrayBuffer, size: number): Uint8Array {
		const inputBytes = new Uint8Array(buffer);
		const image = PhotonImage.new_from_byteslice(inputBytes);

		try {
			const origWidth = image.get_width();
			const origHeight = image.get_height();
			const minDim = Math.min(origWidth, origHeight);

			// Center crop to square
			const x1 = Math.floor((origWidth - minDim) / 2);
			const y1 = Math.floor((origHeight - minDim) / 2);
			const x2 = x1 + minDim;
			const y2 = y1 + minDim;

			const cropped = crop(image, x1, y1, x2, y2);
			try {
				const resized = resize(
					cropped,
					size,
					size,
					SamplingFilter.Lanczos3
				);
				try {
					return resized.get_bytes_webp();
				} finally {
					resized.free();
				}
			} finally {
				cropped.free();
			}
		} finally {
			image.free();
		}
	}

	/**
	 * Upload an avatar and update the user's profile.
	 * Returns { url, thumbUrl } where thumbUrl is a 256×256 WebP thumbnail.
	 */
	async uploadAvatar(user: { id: string }, file: File, origin: string) {
		this.validateFile(file);

		const ext = ALLOWED_TYPES[file.type];
		const uuid = crypto.randomUUID();
		const key = `avatars/${user.id}/${uuid}.${ext}`;
		const thumbKey = `avatars/${user.id}/${uuid}-thumb.webp`;
		const buffer = await file.arrayBuffer();

		// Upload original
		await this.env.STORAGE.put(key, buffer, {
			httpMetadata: { contentType: file.type }
		});

		// Generate and upload 256×256 WebP thumbnail
		const thumbBytes = this.generateSquareThumb(buffer, AVATAR_THUMB_SIZE);
		await this.env.STORAGE.put(thumbKey, thumbBytes, {
			httpMetadata: { contentType: "image/webp" }
		});

		const fileUrl = `${origin}/api/files/${key}`;
		const thumbUrl = `${origin}/api/files/${thumbKey}`;

		await this.db
			.update(schema.users)
			.set({ image: fileUrl, updatedAt: Day().toDate() })
			.where(eq(schema.users.id, user.id));

		return { url: fileUrl, thumbUrl };
	}

	/**
	 * Upload a general image (cover image).
	 * Returns { url, thumbUrl } where thumbUrl is an ≤800px wide WebP thumbnail.
	 */
	async uploadImage(user: { id: string }, file: File, origin: string) {
		this.validateFile(file);

		const ext = ALLOWED_TYPES[file.type];
		const uuid = crypto.randomUUID();
		const key = `images/${user.id}/${uuid}.${ext}`;
		const thumbKey = `images/${user.id}/${uuid}-thumb.webp`;
		const buffer = await file.arrayBuffer();

		// Upload original
		await this.env.STORAGE.put(key, buffer, {
			httpMetadata: { contentType: file.type }
		});

		// Generate and upload ≤800px wide WebP thumbnail
		const thumbBytes = this.generateThumb(buffer, THUMB_MAX_WIDTH);
		await this.env.STORAGE.put(thumbKey, thumbBytes, {
			httpMetadata: { contentType: "image/webp" }
		});

		const fileUrl = `${origin}/api/files/${key}`;
		const thumbUrl = `${origin}/api/files/${thumbKey}`;

		return { url: fileUrl, thumbUrl };
	}

	/**
	 * Get a file from storage.
	 */
	async getFile(key: string) {
		const object = await this.env.STORAGE.get(key);
		if (!object) {
			throw { code: "NOT_FOUND", message: "File not found", status: 404 };
		}
		return object;
	}

	/**
	 * Private helper to validate file size and type.
	 */
	private validateFile(file: File) {
		if (file.size > MAX_SIZE) {
			throw {
				code: "FILE_TOO_LARGE",
				message: "File exceeds the 2 MB size limit",
				status: 400
			};
		}

		if (!ALLOWED_TYPES[file.type]) {
			throw {
				code: "INVALID_FILE_TYPE",
				message: `Invalid file type. Allowed: ${Object.values(ALLOWED_TYPES).join(", ")}`,
				status: 400
			};
		}
	}
}
