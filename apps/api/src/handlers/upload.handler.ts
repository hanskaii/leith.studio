import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { postMetadata } from "@workspace/database";
import { Gate } from "@workspace/core";
import { ApiError } from "../helpers/errors.helper";
import { ApiResponse } from "../helpers/response.helper";
import { authMiddleware } from "../middleware/auth.middleware";
import { UploadService } from "../services/upload.service";
import type { HonoEnv } from "../types/hono.types";

const FileSchema = z.object({
	file: z.instanceof(File)
});

const AssetUploadSchema = z.object({
	file: z.instanceof(File),
	postId: z.string().min(1),
	slug: z.string().min(1)
});

const uploadHandler = new Hono<HonoEnv>()
	.post(
		"/avatar",
		authMiddleware,
		zValidator("form", FileSchema),
		async (c) => {
			const user = c.get("user");
			const { file } = c.req.valid("form");
			const origin = new URL(c.req.url).origin;

			try {
				const service = new UploadService(c.env);
				const result = await service.uploadAvatar(user, file, origin);
				return ApiResponse.ok(c, "Avatar uploaded", result);
			} catch (error: any) {
				throw ApiError.badRequest(error.message ?? "Upload failed");
			}
		}
	)
	.post(
		"/image",
		authMiddleware,
		zValidator("form", FileSchema),
		async (c) => {
			const user = c.get("user");
			const { file } = c.req.valid("form");
			const origin = new URL(c.req.url).origin;

			try {
				const service = new UploadService(c.env);
				const result = await service.uploadImage(user, file, origin);
				return ApiResponse.ok(c, "Image uploaded", result);
			} catch (error: any) {
				throw ApiError.badRequest(error.message ?? "Upload failed");
			}
		}
	)
	.post(
		"/asset",
		authMiddleware,
		zValidator("form", AssetUploadSchema),
		async (c) => {
			const user = c.get("user");
			const db = c.get("db");
			const { file, postId, slug } = c.req.valid("form");

			await Gate.assert("upload.asset", { actor: user });

			const ext = file.name.split(".").pop() ?? "mp4";
			const fileKey = `assets/${slug}.${ext}`;

			await c.env.STORAGE.put(fileKey, await file.arrayBuffer(), {
				httpMetadata: { contentType: file.type }
			});

			await db
				.update(postMetadata)
				.set({ fileKey })
				.where(eq(postMetadata.postId, postId));

			await c.env.VIDEO_PROCESSING_WORKFLOW.create({
				params: { postId, slug, fileKey }
			});

			return ApiResponse.ok(c, "Asset uploaded and processing started", {
				fileKey
			});
		}
	)
	.get("/files/*", async (c) => {
		const key = c.req.path.slice("/api/files/".length);
		if (!key) throw ApiError.notFound("File not found");

		try {
			const service = new UploadService(c.env);
			const object = await service.getFile(key);

			const headers = new Headers();
			object.writeHttpMetadata(headers);
			headers.set("etag", object.httpEtag);
			headers.set("cache-control", "public, max-age=31536000, immutable");

			return new Response(object.body, { headers });
		} catch (error: any) {
			throw ApiError.notFound(error.message ?? "File not found");
		}
	});

export default uploadHandler;
