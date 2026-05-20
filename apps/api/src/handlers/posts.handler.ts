import { Hono } from "hono";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { posts, postMetadata, postStats } from "@workspace/database";
import { Gate } from "@workspace/core";
import { ApiError } from "../helpers/errors.helper";
import { ApiResponse } from "../helpers/response.helper";
import { authMiddleware } from "../middleware/auth.middleware";
import type { HonoEnv } from "../types/hono.types";

const PAGE_SIZE = 12;

const CONTENT_TYPES: Record<string, string> = {
	mp4: "video/mp4",
	png: "image/png",
	jpg: "image/jpeg",
	webm: "video/webm"
};

const postsHandler = new Hono<HonoEnv>()
	.get("/stats", async (c) => {
		const db = c.get("db");
		const [[postCount]] = await Promise.all([
			db
				.select({ count: count() })
				.from(posts)
				.where(eq(posts.status, "published"))
		]);
		return ApiResponse.ok(c, "Stats", { postCount: postCount?.count ?? 0 });
	})
	.get("/", async (c) => {
		const db = c.get("db");
		const page = Number(c.req.query("page") ?? "1");
		const tag = c.req.query("tag");
		const origin = new URL(c.req.url).origin;

		const readyFilter = and(
			eq(posts.status, "published"),
			eq(postMetadata.processingStatus, "ready")
		);

		const [items, [total]] = await Promise.all([
			db
				.select({
					id: posts.id,
					slug: posts.slug,
					title: posts.title,
					coverImage: posts.coverImage,
					coverThumb: posts.coverThumb,
					tags: posts.tags,
					publishedAt: posts.publishedAt,
					format: postMetadata.format,
					resolution: postMetadata.resolution,
					isLoop: postMetadata.isLoop,
					access: postMetadata.access,
					previewKey: postMetadata.previewKey,
					clipKey: postMetadata.clipKey,
					downloadCount: sql<number>`(SELECT COUNT(*) FROM ${postStats} WHERE ${postStats.postId} = ${posts.id})`
				})
				.from(posts)
				.innerJoin(postMetadata, eq(posts.id, postMetadata.postId))
				.where(readyFilter)
				.orderBy(desc(posts.publishedAt))
				.limit(PAGE_SIZE)
				.offset((page - 1) * PAGE_SIZE),
			db
				.select({ count: count() })
				.from(posts)
				.innerJoin(postMetadata, eq(posts.id, postMetadata.postId))
				.where(readyFilter)
		]);

		const raw = tag
			? items.filter((p) => Array.isArray(p.tags) && p.tags.includes(tag))
			: items;

		const filtered = raw.map(({ previewKey, clipKey, ...item }) => ({
			...item,
			previewUrl: previewKey ? `${origin}/api/files/${previewKey}` : null,
			clipUrl: clipKey ? `${origin}/api/files/${clipKey}` : null
		}));

		return ApiResponse.ok(c, "Posts", {
			items: filtered,
			total: total?.count ?? 0,
			page,
			pageSize: PAGE_SIZE
		});
	})
	.get("/:slug", async (c) => {
		const db = c.get("db");
		const slug = c.req.param("slug");
		const origin = new URL(c.req.url).origin;

		const [row] = await db
			.select({
				id: posts.id,
				slug: posts.slug,
				title: posts.title,
				body: posts.body,
				coverImage: posts.coverImage,
				coverThumb: posts.coverThumb,
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
				access: postMetadata.access,
				previewKey: postMetadata.previewKey,
				clipKey: postMetadata.clipKey,
				downloadCount: sql<number>`(SELECT COUNT(*) FROM ${postStats} WHERE ${postStats.postId} = ${posts.id})`
			})
			.from(posts)
			.innerJoin(postMetadata, eq(posts.id, postMetadata.postId))
			.where(and(eq(posts.slug, slug), eq(posts.status, "published")));

		if (!row) throw ApiError.notFound("Post not found");

		const { previewKey, clipKey, ...post } = row;
		const previewUrl = previewKey ? `${origin}/api/files/${previewKey}` : null;
		const clipUrl = clipKey ? `${origin}/api/files/${clipKey}` : null;

		return ApiResponse.ok(c, "Post", { ...post, previewUrl, clipUrl });
	})
	.get("/:slug/download", authMiddleware, async (c) => {
		const db = c.get("db");
		const user = c.get("user");
		const slug = c.req.param("slug");

		const [row] = await db
			.select({
				id: posts.id,
				slug: posts.slug,
				fileKey: postMetadata.fileKey,
				format: postMetadata.format,
				access: postMetadata.access
			})
			.from(posts)
			.innerJoin(postMetadata, eq(posts.id, postMetadata.postId))
			.where(and(eq(posts.slug, slug), eq(posts.status, "published")));

		if (!row) throw ApiError.notFound("Asset not found.");

		await Gate.assert("asset.download", {
			actor: user,
			resource: { access: row.access }
		});

		const object = await c.env.STORAGE.get(row.fileKey);
		if (!object) {
			if (c.env.APP_ENV !== "production") {
				const PLACEHOLDER: Record<string, string> = {
					jpg: "https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=1600&q=80&auto=format&fit=crop&dl=1",
					png: "https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=1600&q=80&auto=format&fit=crop&dl=1",
					mp4: "https://www.w3schools.com/html/mov_bbb.mp4",
					webm: "https://www.w3schools.com/html/mov_bbb.mp4"
				};
				const url = PLACEHOLDER[row.format] ?? PLACEHOLDER.mp4;
				return Response.redirect(url, 302);
			}
			throw ApiError.notFound("Asset file not found.");
		}

		const contentType =
			CONTENT_TYPES[row.format] ?? "application/octet-stream";

		// Fire-and-forget download event
		db.insert(postStats)
			.values({
				id: crypto.randomUUID(),
				postId: row.id,
				userId: user.id,
				downloadedAt: new Date()
			})
			.catch(() => {});

		return new Response(object.body, {
			headers: {
				"Content-Type": contentType,
				"Content-Disposition": `attachment; filename="${row.slug}.${row.format}"`,
				"Cache-Control": "private, no-store"
			}
		});
	});

export default postsHandler;
