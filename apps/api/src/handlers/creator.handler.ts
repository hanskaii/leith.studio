import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { posts } from "@workspace/database";
import { ApiError } from "../helpers/errors.helper";
import { ApiResponse } from "../helpers/response.helper";
import { authMiddleware } from "../middleware/auth.middleware";
import { protect } from "../middleware/protect.middleware";
import { uniqueSlug } from "../lib/slug";
import type { HonoEnv } from "../types/hono.types";

const ALLOWED_TYPES: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp"
};
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

const CreatePostSchema = z.object({
	title: z.string().min(1),
	body: z.string().min(1),
	coverImage: z.string().optional(),
	tags: z.array(z.string()).optional().default([])
});

const UpdatePostSchema = z.object({
	title: z.string().min(1).optional(),
	body: z.string().min(1).optional(),
	coverImage: z.string().nullable().optional(),
	tags: z.array(z.string()).optional(),
	status: z.enum(["draft", "published"]).optional()
});

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
				createdAt: posts.createdAt
			})
			.from(posts)
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

			const post = {
				id: crypto.randomUUID(),
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
				// Only regenerate slug for drafts
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
			const updated = await db.query.posts.findFirst({
				where: eq(posts.id, id)
			});
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
		if (!ALLOWED_TYPES[file.type]) {
			throw ApiError.badRequest(
				"Only JPEG, PNG, and WebP images are supported."
			);
		}

		const ext = ALLOWED_TYPES[file.type];
		const key = `content/${crypto.randomUUID()}.${ext}`;
		const buffer = await file.arrayBuffer();

		await c.env.STORAGE.put(key, buffer, {
			httpMetadata: { contentType: file.type }
		});

		const origin = new URL(c.req.url).origin;
		const url = `${origin}/api/files/${key}`;
		return ApiResponse.ok(c, "Image uploaded", { url });
	});

export default creatorHandler;
