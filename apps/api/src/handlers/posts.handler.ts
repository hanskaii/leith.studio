import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { posts, postMetadata, postStats } from "@workspace/database";
import { Gate } from "@workspace/core";
import { ApiError } from "../helpers/errors.helper";
import { ApiResponse } from "../helpers/response.helper";
import { authMiddleware } from "../middleware/auth.middleware";
import { protect } from "../middleware/protect.middleware";
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
	.get("/", authMiddleware, protect("content.read"), async (c) => {
		const db = c.get("db");
		const page = Number(c.req.query("page") ?? "1");
		const tag = c.req.query("tag");

		const [items, [total]] = await Promise.all([
			db
				.select({
					id: posts.id,
					slug: posts.slug,
					title: posts.title,
					coverImage: posts.coverImage,
					tags: posts.tags,
					publishedAt: posts.publishedAt,
					format: postMetadata.format,
					resolution: postMetadata.resolution,
					isLoop: postMetadata.isLoop,
					access: postMetadata.access,
					downloadCount: sql<number>`(SELECT COUNT(*) FROM ${postStats} WHERE ${postStats.postId} = ${posts.id})`
				})
				.from(posts)
				.innerJoin(postMetadata, eq(posts.id, postMetadata.postId))
				.where(eq(posts.status, "published"))
				.orderBy(desc(posts.publishedAt))
				.limit(PAGE_SIZE)
				.offset((page - 1) * PAGE_SIZE),
			db
				.select({ count: count() })
				.from(posts)
				.innerJoin(postMetadata, eq(posts.id, postMetadata.postId))
				.where(eq(posts.status, "published"))
		]);

		const filtered = tag
			? items.filter((p) => Array.isArray(p.tags) && p.tags.includes(tag))
			: items;

		return ApiResponse.ok(c, "Posts", {
			items: filtered,
			total: total?.count ?? 0,
			page,
			pageSize: PAGE_SIZE
		});
	})
	.get("/:slug", authMiddleware, protect("content.read"), async (c) => {
		const db = c.get("db");
		const slug = c.req.param("slug");

		const [post] = await db
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
				access: postMetadata.access,
				downloadCount: sql<number>`(SELECT COUNT(*) FROM ${postStats} WHERE ${postStats.postId} = ${posts.id})`
			})
			.from(posts)
			.innerJoin(postMetadata, eq(posts.id, postMetadata.postId))
			.where(and(eq(posts.slug, slug), eq(posts.status, "published")));

		if (!post) throw ApiError.notFound("Post not found");

		return ApiResponse.ok(c, "Post", post);
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
		if (!object) throw ApiError.notFound("Asset file not found.");

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
