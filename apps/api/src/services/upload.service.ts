import { database, eq } from "@workspace/database";
import * as schema from "@workspace/database/schema";
import { Day } from "@workspace/core";

const ALLOWED_TYPES: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/gif": "gif",
	"image/webp": "webp",
	"image/avif": "avif"
};

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

export class UploadService {
	private get db() {
		return database(this.env.DATABASE);
	}

	constructor(private readonly env: CloudflareBindings) {}

	/**
	 * Upload an avatar and update the user's profile.
	 */
	async uploadAvatar(user: { id: string }, file: File, origin: string) {
		this.validateFile(file);

		const ext = ALLOWED_TYPES[file.type];
		const key = `avatars/${user.id}/${crypto.randomUUID()}.${ext}`;
		const buffer = await file.arrayBuffer();

		await this.env.STORAGE.put(key, buffer, {
			httpMetadata: { contentType: file.type }
		});

		const fileUrl = `${origin}/api/files/${key}`;

		await this.db
			.update(schema.users)
			.set({ image: fileUrl, updatedAt: Day().toDate() })
			.where(eq(schema.users.id, user.id));

		return { url: fileUrl };
	}

	/**
	 * Upload a general image.
	 */
	async uploadImage(user: { id: string }, file: File, origin: string) {
		this.validateFile(file);

		const ext = ALLOWED_TYPES[file.type];
		const key = `images/${user.id}/${crypto.randomUUID()}.${ext}`;
		const buffer = await file.arrayBuffer();

		await this.env.STORAGE.put(key, buffer, {
			httpMetadata: { contentType: file.type }
		});

		const fileUrl = `${origin}/api/files/${key}`;

		return { url: fileUrl };
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
