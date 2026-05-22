import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { posts, postMetadata, postTags, tags } from "@workspace/database";
import { slugifyTag } from "@workspace/database/utils/slug";
import { ApiError } from "../helpers/errors.helper";
import { ApiResponse } from "../helpers/response.helper";
import { authMiddleware } from "../middleware/auth.middleware";
import { protect } from "../middleware/protect.middleware";
import { uniqueSlug } from "../lib/slug";
import { UploadService } from "../services/upload.service";
import { SearchService } from "../services/search.service";
import type { HonoEnv } from "../types/hono.types";

type TagRef = { slug: string; name: string };

function parseTags(raw: string | null | undefined): TagRef[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as TagRef[]) : [];
	} catch {
		return [];
	}
}

/**
 * Idempotently link `tagNames` to `postId`:
 *  1. UPSERT each name into the `tags` table (by slug)
 *  2. Insert a `post_tags` row for each (skip dupes via composite PK)
 *
 * Caller is responsible for clearing existing post_tags first if the input
 * represents the full desired set (PATCH semantics).
 */
async function upsertPostTags(
	db: any,
	postId: string,
	tagNames: string[]
): Promise<void> {
	if (tagNames.length === 0) return;
	const now = new Date();
	for (const name of tagNames) {
		const slug = slugifyTag(name);
		if (!slug) continue;
		await db
			.insert(tags)
			.values({
				id: crypto.randomUUID(),
				slug,
				name,
				createdAt: now
			})
			.onConflictDoNothing({ target: tags.slug });

		const [existing] = await db
			.select({ id: tags.id })
			.from(tags)
			.where(eq(tags.slug, slug))
			.limit(1);

		if (!existing) continue;

		await db
			.insert(postTags)
			.values({ postId, tagId: existing.id })
			.onConflictDoNothing();
	}
}

const ALLOWED_ASSET_TYPES: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"video/mp4": "mp4",
	"video/webm": "webm",
	"audio/mpeg": "mp3",
	"audio/mp3": "mp3",
	"audio/wav": "wav",
	"audio/ogg": "ogg",
	"audio/aac": "aac"
};

const PROCESSABLE_FORMATS = new Set([
	"mp4",
	"webm",
	"mp3",
	"wav",
	"ogg",
	"aac"
]);

const MAX_ASSET_SIZE = 200 * 1024 * 1024; // 200 MB

const AssetMetaSchema = z.object({
	format: z
		.enum(["mp4", "png", "jpg", "webm", "mp3", "wav", "ogg", "aac"])
		.optional(),
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
		coverThumb: z.string().nullable().optional(),
		tags: z.array(z.string()).optional().default([])
	})
	.merge(AssetMetaSchema);

const UpdatePostSchema = z
	.object({
		title: z.string().min(1).optional(),
		body: z.string().min(1).optional(),
		coverImage: z.string().nullable().optional(),
		coverThumb: z.string().nullable().optional(),
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
				coverImage: posts.coverImage,
				coverThumb: posts.coverThumb,
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
				coverThumb: data.coverThumb ?? null,
				status: "draft" as const,
				publishedAt: null,
				createdAt: now,
				updatedAt: now
			};

			await db.insert(posts).values(post);
			await upsertPostTags(db, postId, data.tags ?? []);

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

				if (PROCESSABLE_FORMATS.has(data.format!)) {
					await c.env.VIDEO_PROCESSING_WORKFLOW.create({
						params: {
							postId,
							slug,
							fileKey: data.fileKey!,
							format: data.format!
						}
					});
				}

				// Index for search now that the post has format/access. Posts
				// without metadata are invisible to the feed anyway (the feed
				// requires processingStatus='ready' on a metadata row), so
				// skipping the no-meta branch is correct.
				await new SearchService(c.env).index({
					id: postId,
					slug,
					title: data.title,
					body: data.body,
					tags: (data.tags ?? [])
						.map((name) => ({
							slug: slugifyTag(name),
							name
						}))
						.filter((t) => t.slug.length > 0),
					format: data.format!,
					access: data.access ?? "premium",
					publishedAt: null
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
			if (data.coverThumb !== undefined)
				updates.coverThumb = data.coverThumb;
			if (data.status !== undefined) {
				updates.status = data.status;
				if (data.status === "published" && !existing.publishedAt) {
					updates.publishedAt = new Date();
				}
			}

			await db.update(posts).set(updates).where(eq(posts.id, id));

			// Tag replacement: treat the input as the full desired set.
			// Drop existing junction rows then re-upsert. Tag rows themselves
			// are never deleted — orphan tags get filtered out of /api/v1/tags
			// because that endpoint joins on post_tags.
			if (data.tags !== undefined) {
				await db.delete(postTags).where(eq(postTags.postId, id));
				await upsertPostTags(db, id, data.tags);
			}

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
					if (data.fileKey !== undefined) {
						metaUpdates.fileKey = data.fileKey;
						metaUpdates.processingStatus = "pending";
						metaUpdates.previewKey = null;
						metaUpdates.clipKey = null;
					}
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

				const newFileKey = data.fileKey;
				const newFormat = data.format ?? existingMeta?.format;
				if (
					newFileKey &&
					newFormat &&
					PROCESSABLE_FORMATS.has(newFormat)
				) {
					const slug = existing.slug;
					await c.env.VIDEO_PROCESSING_WORKFLOW.create({
						params: {
							postId: id,
							slug,
							fileKey: newFileKey,
							format: newFormat
						}
					});
				}
			}

			const updatedRow = await db
				.select({
					id: posts.id,
					slug: posts.slug,
					title: posts.title,
					body: posts.body,
					coverImage: posts.coverImage,
					coverThumb: posts.coverThumb,
					tags: sql<string>`COALESCE(
						JSON_GROUP_ARRAY(
							JSON_OBJECT('slug', ${tags.slug}, 'name', ${tags.name})
						) FILTER (WHERE ${tags.id} IS NOT NULL),
						'[]'
					)`,
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
				.leftJoin(postTags, eq(postTags.postId, posts.id))
				.leftJoin(tags, eq(tags.id, postTags.tagId))
				.where(eq(posts.id, id))
				.groupBy(posts.id)
				.then((rows) => rows[0]);

			const updated = updatedRow
				? {
						...updatedRow,
						tags: parseTags(updatedRow.tags)
					}
				: undefined;

			// Re-index after update. The SELECT above already has the joined
			// tags + metadata, so we just shape it into IndexablePost. Skip if
			// the post somehow has no metadata (no format → nothing to index).
			if (updated && updated.format) {
				await new SearchService(c.env).index({
					id: updated.id,
					slug: updated.slug,
					title: updated.title,
					body: updated.body,
					tags: updated.tags,
					format: updated.format,
					access:
						(updated.access as "free" | "premium" | undefined) ??
						"premium",
					publishedAt: updated.publishedAt ?? null
				});
			}

			return ApiResponse.ok(c, "Post updated", updated);
		}
	)
	.get(
		"/posts/:id/status",
		authMiddleware,
		protect("content.manage"),
		async (c) => {
			const db = c.get("db");
			const id = c.req.param("id");

			const meta = await db.query.postMetadata.findFirst({
				where: eq(postMetadata.postId, id)
			});
			if (!meta) throw ApiError.notFound("Post metadata not found");

			return ApiResponse.ok(c, "Processing status", {
				processingStatus: meta.processingStatus,
				previewKey: meta.previewKey ?? null,
				clipKey: meta.clipKey ?? null,
				format: meta.format
			});
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
			await new SearchService(c.env).deindex(id);
			return ApiResponse.ok(c, "Post deleted", null);
		}
	)
	.post("/upload", authMiddleware, protect("content.manage"), async (c) => {
		const formData = await c.req.formData();
		const file = formData.get("file");

		if (!(file instanceof File)) {
			throw ApiError.badRequest("A file is required.");
		}

		const user = c.get("user");
		const origin = new URL(c.req.url).origin;
		const uploadService = new UploadService(c.env);

		try {
			const result = await uploadService.uploadImage(user, file, origin);
			return ApiResponse.ok(c, "Image uploaded", result);
		} catch (err: any) {
			if (err.status === 400) {
				throw ApiError.badRequest(err.message);
			}
			throw err;
		}
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
