import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { posts } from "@workspace/database";
import { ApiError } from "../helpers/errors.helper";
import { ApiResponse } from "../helpers/response.helper";
import { authMiddleware } from "../middleware/auth.middleware";
import { protect } from "../middleware/protect.middleware";
import type { HonoEnv } from "../types/hono.types";

const PAGE_SIZE = 12;

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

		const where = tag
			? and(eq(posts.status, "published"), sql`json_each.value = ${tag}`)
			: eq(posts.status, "published");

		const [items, [total]] = await Promise.all([
			db
				.select({
					id: posts.id,
					slug: posts.slug,
					title: posts.title,
					coverImage: posts.coverImage,
					tags: posts.tags,
					publishedAt: posts.publishedAt
				})
				.from(posts)
				.where(eq(posts.status, "published"))
				.orderBy(desc(posts.publishedAt))
				.limit(PAGE_SIZE)
				.offset((page - 1) * PAGE_SIZE),
			db
				.select({ count: count() })
				.from(posts)
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

		const post = await db.query.posts.findFirst({
			where: and(eq(posts.slug, slug), eq(posts.status, "published"))
		});

		if (!post) throw ApiError.notFound("Post not found");

		return ApiResponse.ok(c, "Post", post);
	});

export default postsHandler;
