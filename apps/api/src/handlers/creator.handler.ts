import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc, inArray, sql } from "drizzle-orm";
import {
	posts,
	postAssets,
	postMetadata,
	postTags,
	tags
} from "@workspace/database";
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

async function upsertPostTags(
	db: any,
	postId: string,
	tagNames: string[]
): Promise<void> {
	if (tagNames.length === 0) return;

	const now = new Date();
	const bySlug = new Map<string, string>();
	for (const name of tagNames) {
		const slug = slugifyTag(name);
		if (!slug) continue;
		if (!bySlug.has(slug)) bySlug.set(slug, name);
	}
	if (bySlug.size === 0) return;

	const tagRows = Array.from(bySlug.entries()).map(([slug, name]) => ({
		id: crypto.randomUUID(),
		slug,
		name,
		createdAt: now
	}));
	const slugs = tagRows.map((r) => r.slug);

	await db.insert(tags).values(tagRows).onConflictDoNothing({
		target: tags.slug
	});

	const existing = await db
		.select({ id: tags.id, slug: tags.slug })
		.from(tags)
		.where(inArray(tags.slug, slugs));

	if (existing.length === 0) return;

	await db
		.insert(postTags)
		.values(existing.map((e: { id: string }) => ({ postId, tagId: e.id })))
		.onConflictDoNothing();
}

async function upsertAsset(
	db: any,
	postId: string,
	role: "cover" | "thumb" | "asset",
	key: string,
	format: string
) {
	await db
		.insert(postAssets)
		.values({
			id: crypto.randomUUID(),
			postId,
			role,
			key,
			format
		})
		.onConflictDoUpdate({
			target: [postAssets.postId, postAssets.role],
			set: { key, format }
		});
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
		tags: z.array(z.string()).optional().default([])
	})
	.merge(AssetMetaSchema);

const UpdatePostSchema = z
	.object({
		title: z.string().min(1).optional(),
		body: z.string().min(1).optional(),
		tags: z.array(z.string()).optional(),
		status: z.enum(["draft", "published"]).optional()
	})
	.merge(AssetMetaSchema);

const mediaSubquery = sql<string>`COALESCE(
	(SELECT JSON_GROUP_OBJECT(role, key) FROM post_assets WHERE post_id = ${posts.id}),
	'{}'
)`;

const creatorHandler = new Hono<HonoEnv>()
	.get("/posts", authMiddleware, protect("content.manage"), async (c) => {
		const db = c.get("db");
		const items = await db
			.select({
				id: posts.id,
				slug: posts.slug,
				title: posts.title,
				body: posts.body,
				media: mediaSubquery,
				status: posts.status,
				mediaStatus: posts.mediaStatus,
				enrichmentStatus: posts.enrichmentStatus,
				access: posts.access,
				publishedAt: posts.publishedAt,
				createdAt: posts.createdAt,
				format: postMetadata.format,
				resolution: postMetadata.resolution,
				duration: postMetadata.duration,
				isLoop: postMetadata.isLoop,
				fileSize: postMetadata.fileSize
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
			const user = c.get("user");
			const data = c.req.valid("json");
			const slug = await uniqueSlug(data.title, db);
			const now = new Date();
			const postId = crypto.randomUUID();

			const post = {
				id: postId,
				authorId: user.id,
				slug,
				title: data.title,
				body: data.body,
				status: "draft" as const,
				mediaStatus: "ready" as const,
				access: data.access ?? "premium",
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
					isLoop: data.isLoop ?? false,
					fileSize: data.fileSize!
				});

				await upsertAsset(
					db,
					postId,
					"asset",
					data.fileKey!,
					data.format!
				);

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
			if (data.access !== undefined) updates.access = data.access;
			if (data.status !== undefined) {
				updates.status = data.status;
				if (data.status === "published" && !existing.publishedAt) {
					updates.publishedAt = new Date();
				}
			}

			await db.update(posts).set(updates).where(eq(posts.id, id));

			if (data.tags !== undefined) {
				await db.delete(postTags).where(eq(postTags.postId, id));
				await upsertPostTags(db, id, data.tags);
			}

			// Upsert post_metadata + post_assets when any asset field is present
			const hasMetaUpdate =
				data.fileKey !== undefined ||
				data.format !== undefined ||
				data.resolution !== undefined ||
				data.duration !== undefined ||
				data.isLoop !== undefined ||
				data.fileSize !== undefined;

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
						metaUpdates.isLoop = data.isLoop;
					if (data.fileSize !== undefined)
						metaUpdates.fileSize = data.fileSize;
					if (Object.keys(metaUpdates).length > 0) {
						await db
							.update(postMetadata)
							.set(metaUpdates)
							.where(eq(postMetadata.postId, id));
					}
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
						isLoop: data.isLoop ?? false,
						fileSize: data.fileSize
					});
				}

				if (data.fileKey && data.format) {
					await upsertAsset(
						db,
						id,
						"asset",
						data.fileKey,
						data.format
					);
				}
			}

			const updatedRow = await db
				.select({
					id: posts.id,
					slug: posts.slug,
					title: posts.title,
					body: posts.body,
					media: mediaSubquery,
					tags: sql<string>`COALESCE(
						JSON_GROUP_ARRAY(
							JSON_OBJECT('slug', ${tags.slug}, 'name', ${tags.name})
						) FILTER (WHERE ${tags.id} IS NOT NULL),
						'[]'
					)`,
					status: posts.status,
					mediaStatus: posts.mediaStatus,
					access: posts.access,
					publishedAt: posts.publishedAt,
					createdAt: posts.createdAt,
					updatedAt: posts.updatedAt,
					format: postMetadata.format,
					resolution: postMetadata.resolution,
					duration: postMetadata.duration,
					isLoop: postMetadata.isLoop,
					fileSize: postMetadata.fileSize
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

			if (updated && updated.format) {
				await new SearchService(c.env).index({
					id: updated.id,
					slug: updated.slug,
					title: updated.title,
					body: updated.body,
					tags: updated.tags,
					format: updated.format,
					access: updated.access ?? "premium",
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

			const post = await db.query.posts.findFirst({
				where: eq(posts.id, id),
				columns: { id: true, mediaStatus: true }
			});
			if (!post) throw ApiError.notFound("Post not found");

			const meta = await db.query.postMetadata.findFirst({
				where: eq(postMetadata.postId, id)
			});

			return ApiResponse.ok(c, "Media status", {
				mediaStatus: post.mediaStatus,
				format: meta?.format ?? null
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
	.post(
		"/upload-cover",
		authMiddleware,
		protect("content.manage"),
		async (c) => {
			const formData = await c.req.formData();
			const file = formData.get("file");

			if (!(file instanceof File)) {
				throw ApiError.badRequest("A file is required.");
			}

			const user = c.get("user");
			const origin = new URL(c.req.url).origin;
			const uploadService = new UploadService(c.env);

			try {
				const result = await uploadService.uploadImage(
					user,
					file,
					origin
				);
				return ApiResponse.ok(c, "Image uploaded", result);
			} catch (err: any) {
				if (err.status === 400) {
					throw ApiError.badRequest(err.message);
				}
				throw err;
			}
		}
	)
	.post("/upload", authMiddleware, protect("content.manage"), async (c) => {
		const formData = await c.req.formData();
		const file = formData.get("file");

		if (!(file instanceof File)) {
			throw ApiError.badRequest("A file is required.");
		}
		if (file.size > MAX_ASSET_SIZE) {
			throw ApiError.badRequest("File too large. Maximum size is 200MB.");
		}
		if (!ALLOWED_ASSET_TYPES[file.type]) {
			throw ApiError.badRequest("Unsupported file type.");
		}

		const user = c.get("user");
		const db = c.get("db");
		const ext = ALLOWED_ASSET_TYPES[file.type];
		const uuid = crypto.randomUUID();
		const key = `posts/assets/${uuid}/${file.name || `asset.${ext}`}`;
		const buffer = await file.arrayBuffer();

		// 1. Store in R2.
		await c.env.STORAGE.put(key, buffer, {
			httpMetadata: { contentType: file.type }
		});

		// 2. Create the post + post_assets in one transaction. Title defaults
		//    to the filename minus extension; the AI enrichment workflow
		//    overwrites it (and body) once it runs.
		const postId = crypto.randomUUID();
		const fallbackTitle =
			file.name?.replace(/\.[^.]+$/, "") || "Untitled upload";
		const slug = await uniqueSlug(fallbackTitle, db);
		const now = new Date();

		const post = {
			id: postId,
			authorId: user.id,
			slug,
			title: fallbackTitle,
			body: "",
			status: "draft" as const,
			mediaStatus: "ready" as const,
			access: "premium" as const,
			enrichmentStatus: "pending" as const,
			publishedAt: null,
			createdAt: now,
			updatedAt: now
		};

		await db.insert(posts).values(post);
		await db.insert(postAssets).values({
			id: crypto.randomUUID(),
			postId,
			role: "asset",
			key,
			format: ext
		});

		// 3. Fire-and-forget enrichment trigger. We deliberately don't await —
		//    upload response should return as soon as R2 + DB are durable.
		c.env.AI_ENRICH_WORKFLOW.create({
			id: `enrich-${postId}`,
			params: { postId }
		}).catch((err) => {
			console.error(
				"[ai-enrich] failed to create workflow for",
				postId,
				err
			);
		});

		return ApiResponse.created(c, "Upload created", { postId, post });
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
