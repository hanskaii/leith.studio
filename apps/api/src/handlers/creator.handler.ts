import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { posts, postMetadata } from "@workspace/database";
import { ApiError } from "../helpers/errors.helper";
import { ApiResponse } from "../helpers/response.helper";
import { authMiddleware } from "../middleware/auth.middleware";
import { protect } from "../middleware/protect.middleware";
import { uniqueSlug } from "../lib/slug";
import type { HonoEnv } from "../types/hono.types";

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp"
};

const ALLOWED_ASSET_TYPES: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"video/mp4": "mp4",
	"video/webm": "webm"
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ASSET_SIZE = 200 * 1024 * 1024; // 200 MB

const AssetMetaSchema = z.object({
	format: z.enum(["mp4", "png", "jpg", "webm"]).optional(),
	resolution: z.string().optional(),
	duration: z.number().int().positive().optional().nullable(),
	isLoop: z.boolean().optional(),
	fileKey: z.string().optional(),
	fileSize: z.number().int().positive().optional(),
	access: z.enum(["free", "premium"]).optional()
});

const CreatePostSchema = z
	.object({
		title: z.string().min(1),
		body: z.string().min(1),
		coverImage: z.string().optional(),
		tags: z.array(z.string()).optional().default([])
	})
	.merge(AssetMetaSchema);

const UpdatePostSchema = z
	.object({
		title: z.string().min(1).optional(),
		body: z.string().min(1).optional(),
		coverImage: z.string().nullable().optional(),
		tags: z.array(z.string()).optional(),
		status: z.enum(["draft", "published"]).optional()
	})
	.merge(AssetMetaSchema);

const creatorHandler = new Hono<HonoEnv>()
	.get("/posts", authMiddleware, protect("content.manage"), async (c) => {
		const db = c.get("db");
		const items = await db
			.select({
				id: posts.id,
				slug: posts.slug,
				title: posts.title,
				status: posts.status,
				publishedAt: posts.publishedAt,
				createdAt: posts.createdAt,
				format: postMetadata.format,
				access: postMetadata.access
			})
			.from(posts)
			.leftJoin(postMetadata, eq(posts.id, postMetadata.postId))
			.orderBy(desc(posts.createdAt));
		return ApiResponse.ok(c, "Creator posts", items);
	})
	.post(
		"/posts",
		authMiddleware,
		protect("content.manage"),
		zValidator("json", CreatePostSchema),
		async (c) => {
			const db = c.get("db");
			const data = c.req.valid("json");
			const slug = await uniqueSlug(data.title, db);
			const now = new Date();
			const postId = crypto.randomUUID();

			const post = {
				id: postId,
				slug,
				title: data.title,
				body: data.body,
				coverImage: data.coverImage ?? null,
				tags: data.tags,
				status: "draft" as const,
				publishedAt: null,
				createdAt: now,
				updatedAt: now
			};

			await db.insert(posts).values(post);

			const hasMeta =
				data.fileKey &&
				data.format &&
				data.resolution &&
				data.fileSize !== undefined;

			if (hasMeta) {
				await db.insert(postMetadata).values({
					postId,
					format: data.format!,
					resolution: data.resolution!,
					duration: data.duration ?? null,
					isLoop: data.isLoop ? 1 : 0,
					fileKey: data.fileKey!,
					fileSize: data.fileSize!,
					access: data.access ?? "premium"
				});
			}

			return ApiResponse.created(c, "Post created", post);
		}
	)
	.patch(
		"/posts/:id",
		authMiddleware,
		protect("content.manage"),
		zValidator("json", UpdatePostSchema),
		async (c) => {
			const db = c.get("db");
			const id = c.req.param("id");
			const data = c.req.valid("json");

			const existing = await db.query.posts.findFirst({
				where: eq(posts.id, id)
			});
			if (!existing) throw ApiError.notFound("Post not found");

			const updates: Record<string, unknown> = { updatedAt: new Date() };

			if (data.title !== undefined) {
				updates.title = data.title;
				if (existing.status === "draft") {
					updates.slug = await uniqueSlug(
						data.title,
						db,
						existing.slug
					);
				}
			}
			if (data.body !== undefined) updates.body = data.body;
			if (data.coverImage !== undefined)
				updates.coverImage = data.coverImage;
			if (data.tags !== undefined) updates.tags = data.tags;
			if (data.status !== undefined) {
				updates.status = data.status;
				if (data.status === "published" && !existing.publishedAt) {
					updates.publishedAt = new Date();
				}
			}

			await db.update(posts).set(updates).where(eq(posts.id, id));

			// Upsert post_metadata when any asset field is present
			const hasMetaUpdate =
				data.fileKey !== undefined ||
				data.format !== undefined ||
				data.resolution !== undefined ||
				data.duration !== undefined ||
				data.isLoop !== undefined ||
				data.fileSize !== undefined ||
				data.access !== undefined;

			if (hasMetaUpdate) {
				const existingMeta = await db.query.postMetadata.findFirst({
					where: eq(postMetadata.postId, id)
				});

				if (existingMeta) {
					const metaUpdates: Record<string, unknown> = {};
					if (data.format !== undefined)
						metaUpdates.format = data.format;
					if (data.resolution !== undefined)
						metaUpdates.resolution = data.resolution;
					if (data.duration !== undefined)
						metaUpdates.duration = data.duration;
					if (data.isLoop !== undefined)
						metaUpdates.isLoop = data.isLoop ? 1 : 0;
					if (data.fileKey !== undefined)
						metaUpdates.fileKey = data.fileKey;
					if (data.fileSize !== undefined)
						metaUpdates.fileSize = data.fileSize;
					if (data.access !== undefined)
						metaUpdates.access = data.access;
					await db
						.update(postMetadata)
						.set(metaUpdates)
						.where(eq(postMetadata.postId, id));
				} else if (
					data.fileKey &&
					data.format &&
					data.resolution &&
					data.fileSize !== undefined
				) {
					await db.insert(postMetadata).values({
						postId: id,
						format: data.format,
						resolution: data.resolution,
						duration: data.duration ?? null,
						isLoop: data.isLoop ? 1 : 0,
						fileKey: data.fileKey,
						fileSize: data.fileSize,
						access: data.access ?? "premium"
					});
				}
			}

			const updated = await db
				.select({
					id: posts.id,
					slug: posts.slug,
					title: posts.title,
					body: posts.body,
					coverImage: posts.coverImage,
					tags: posts.tags,
					status: posts.status,
					publishedAt: posts.publishedAt,
					createdAt: posts.createdAt,
					updatedAt: posts.updatedAt,
					format: postMetadata.format,
					resolution: postMetadata.resolution,
					duration: postMetadata.duration,
					isLoop: postMetadata.isLoop,
					fileSize: postMetadata.fileSize,
					access: postMetadata.access
				})
				.from(posts)
				.leftJoin(postMetadata, eq(posts.id, postMetadata.postId))
				.where(eq(posts.id, id))
				.then((rows) => rows[0]);

			return ApiResponse.ok(c, "Post updated", updated);
		}
	)
	.delete(
		"/posts/:id",
		authMiddleware,
		protect("content.manage"),
		async (c) => {
			const db = c.get("db");
			const id = c.req.param("id");

			const existing = await db.query.posts.findFirst({
				where: eq(posts.id, id)
			});
			if (!existing) throw ApiError.notFound("Post not found");
			if (existing.status === "published") {
				throw ApiError.conflict("Unpublish the post before deleting.");
			}

			await db.delete(posts).where(eq(posts.id, id));
			return ApiResponse.ok(c, "Post deleted", null);
		}
	)
	.post("/upload", authMiddleware, protect("content.manage"), async (c) => {
		const formData = await c.req.formData();
		const file = formData.get("file");

		if (!(file instanceof File)) {
			throw ApiError.badRequest("A file is required.");
		}
		if (file.size > MAX_IMAGE_SIZE) {
			throw ApiError.badRequest("File must be under 5MB.");
		}
		if (!ALLOWED_IMAGE_TYPES[file.type]) {
			throw ApiError.badRequest(
				"Only JPEG, PNG, and WebP images are supported."
			);
		}

		const ext = ALLOWED_IMAGE_TYPES[file.type];
		const key = `content/${crypto.randomUUID()}.${ext}`;
		const buffer = await file.arrayBuffer();

		await c.env.STORAGE.put(key, buffer, {
			httpMetadata: { contentType: file.type }
		});

		const origin = new URL(c.req.url).origin;
		const url = `${origin}/api/files/${key}`;
		return ApiResponse.ok(c, "Image uploaded", { url });
	})
	.post(
		"/upload-asset",
		authMiddleware,
		protect("content.manage"),
		async (c) => {
			const formData = await c.req.formData();
			const file = formData.get("file");

			if (!(file instanceof File)) {
				throw ApiError.badRequest("A file is required.");
			}
			if (file.size > MAX_ASSET_SIZE) {
				throw ApiError.badRequest(
					"File too large. Maximum size is 200MB."
				);
			}
			if (!ALLOWED_ASSET_TYPES[file.type]) {
				throw ApiError.badRequest("Unsupported file type.");
			}

			const ext = ALLOWED_ASSET_TYPES[file.type];
			const uuid = crypto.randomUUID();
			const key = `posts/assets/${uuid}/${file.name || `asset.${ext}`}`;
			const buffer = await file.arrayBuffer();

			await c.env.STORAGE.put(key, buffer, {
				httpMetadata: { contentType: file.type }
			});

			const origin = new URL(c.req.url).origin;
			const url = `${origin}/api/files/${key}`;
			return ApiResponse.ok(c, "Asset uploaded", { url, key });
		}
	);

export default creatorHandler;
