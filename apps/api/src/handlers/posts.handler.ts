import { Hono } from "hono";
import { eq, and, desc, count, sql, inArray } from "drizzle-orm";
import {
	posts,
	postAssets,
	postMetadata,
	postStats,
	postTags,
	tags
} from "@workspace/database";
import { Gate } from "@workspace/core";
import { ApiError } from "../helpers/errors.helper";
import { ApiResponse } from "../helpers/response.helper";
import { authMiddleware } from "../middleware/auth.middleware";
import { SearchService, type SearchHit } from "../services/search.service";
import type { HonoEnv } from "../types/hono.types";

const PAGE_SIZE = 12;

const CONTENT_TYPES: Record<string, string> = {
	mp4: "video/mp4",
	webm: "video/webm",
	png: "image/png",
	jpg: "image/jpeg",
	mp3: "audio/mpeg",
	wav: "audio/wav",
	ogg: "audio/ogg",
	aac: "audio/aac"
};

type TagRef = { slug: string; name: string };
type MediaMap = { cover?: string; thumb?: string; asset?: string };

function parseTags(raw: string | null | undefined): TagRef[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as TagRef[]) : [];
	} catch {
		return [];
	}
}

function parseMedia(raw: string | null | undefined): MediaMap {
	if (!raw) return {};
	try {
		const parsed = JSON.parse(raw);
		return typeof parsed === "object" && parsed !== null
			? (parsed as MediaMap)
			: {};
	} catch {
		return {};
	}
}

function toUrl(key: string | undefined, origin: string): string | null {
	if (!key) return null;
	// Seed data and externally-hosted thumbnails are stored as full URLs.
	// Pass them through; only prepend the R2 proxy prefix for relative keys.
	if (/^https?:\/\//.test(key)) return key;
	return `${origin}/api/files/${key}`;
}

const mediaSubquery = sql<string>`COALESCE(
	(SELECT JSON_GROUP_OBJECT(role, key) FROM post_assets WHERE post_id = ${posts.id}),
	'{}'
)`;

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
		const q = c.req.query("q")?.trim();
		const origin = new URL(c.req.url).origin;

		// Search path — when ?q= is set, route through AI Search for semantic
		// ranking, then hydrate from D1. Tag filter (if any) is layered as a
		// SQL constraint on top of the AI Search candidate ids.
		if (q) {
			const searchService = new SearchService(c.env);
			let hits: SearchHit[] = [];
			try {
				hits = await searchService.search({ query: q, max: 50 });
			} catch (err) {
				console.error(
					"[search] AI Search failed, falling back to LIKE",
					err
				);
				hits = await searchService.sqlFallback(db, q);
			}

			if (hits.length === 0) {
				return ApiResponse.ok(c, "Posts", {
					items: [],
					total: 0,
					page: 1,
					pageSize: 50
				});
			}

			const idsByRank = hits.map((h) => h.postId);
			const rankIndex = new Map(idsByRank.map((id, i) => [id, i]));

			const searchTagFilter = tag
				? inArray(
						posts.id,
						db
							.select({ postId: postTags.postId })
							.from(postTags)
							.innerJoin(tags, eq(tags.id, postTags.tagId))
							.where(eq(tags.slug, tag))
					)
				: undefined;

			const searchRows = await db
				.select({
					id: posts.id,
					slug: posts.slug,
					title: posts.title,
					media: mediaSubquery,
					tags: sql<string>`COALESCE(
						JSON_GROUP_ARRAY(
							JSON_OBJECT('slug', ${tags.slug}, 'name', ${tags.name})
						) FILTER (WHERE ${tags.id} IS NOT NULL),
						'[]'
					)`,
					publishedAt: posts.publishedAt,
					format: postMetadata.format,
					resolution: postMetadata.resolution,
					isLoop: postMetadata.isLoop,
					access: posts.access,
					downloadCount: count(postStats.id)
				})
				.from(posts)
				.innerJoin(postMetadata, eq(posts.id, postMetadata.postId))
				.leftJoin(postTags, eq(postTags.postId, posts.id))
				.leftJoin(tags, eq(tags.id, postTags.tagId))
				.leftJoin(postStats, eq(postStats.postId, posts.id))
				.where(
					and(
						eq(posts.status, "published"),
						eq(posts.mediaStatus, "ready"),
						inArray(posts.id, idsByRank),
						searchTagFilter
					)
				)
				.groupBy(posts.id);

			// SQL `IN` returns unordered rows — re-sort against the AI Search
			// rank map so the response preserves relevance order.
			const searchItems = searchRows
				.map(({ media: mediaRaw, tags: tagsRaw, ...item }) => {
					const media = parseMedia(mediaRaw);
					return {
						...item,
						tags: parseTags(tagsRaw),
						coverUrl: toUrl(media.cover, origin),
						thumbUrl: toUrl(media.thumb, origin)
					};
				})
				.sort((a, b) => {
					const ai = rankIndex.get(a.id) ?? Infinity;
					const bi = rankIndex.get(b.id) ?? Infinity;
					return ai - bi;
				});

			return ApiResponse.ok(c, "Posts", {
				items: searchItems,
				total: searchItems.length,
				page: 1,
				pageSize: searchItems.length
			});
		}

		// Browse path — no ?q=, pure SQL pagination + optional tag filter.
		const tagFilter = tag
			? inArray(
					posts.id,
					db
						.select({ postId: postTags.postId })
						.from(postTags)
						.innerJoin(tags, eq(tags.id, postTags.tagId))
						.where(eq(tags.slug, tag))
				)
			: undefined;

		const readyFilter = and(
			eq(posts.status, "published"),
			eq(posts.mediaStatus, "ready"),
			tagFilter
		);

		const [rawItems, [total]] = await Promise.all([
			db
				.select({
					id: posts.id,
					slug: posts.slug,
					title: posts.title,
					media: mediaSubquery,
					tags: sql<string>`COALESCE(
						JSON_GROUP_ARRAY(
							JSON_OBJECT('slug', ${tags.slug}, 'name', ${tags.name})
						) FILTER (WHERE ${tags.id} IS NOT NULL),
						'[]'
					)`,
					publishedAt: posts.publishedAt,
					format: postMetadata.format,
					resolution: postMetadata.resolution,
					isLoop: postMetadata.isLoop,
					access: posts.access,
					downloadCount: count(postStats.id)
				})
				.from(posts)
				.innerJoin(postMetadata, eq(posts.id, postMetadata.postId))
				.leftJoin(postTags, eq(postTags.postId, posts.id))
				.leftJoin(tags, eq(tags.id, postTags.tagId))
				.leftJoin(postStats, eq(postStats.postId, posts.id))
				.where(readyFilter)
				.groupBy(posts.id)
				.orderBy(desc(posts.publishedAt))
				.limit(PAGE_SIZE)
				.offset((page - 1) * PAGE_SIZE),
			db
				.select({ count: count(sql`DISTINCT ${posts.id}`) })
				.from(posts)
				.innerJoin(postMetadata, eq(posts.id, postMetadata.postId))
				.where(readyFilter)
		]);

		const items = rawItems.map(
			({ media: mediaRaw, tags: tagsRaw, ...item }) => {
				const media = parseMedia(mediaRaw);
				return {
					...item,
					tags: parseTags(tagsRaw),
					coverUrl: toUrl(media.cover, origin),
					thumbUrl: toUrl(media.thumb, origin)
				};
			}
		);

		return ApiResponse.ok(c, "Posts", {
			items,
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
				media: mediaSubquery,
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
				access: posts.access,
				downloadCount: count(postStats.id)
			})
			.from(posts)
			.innerJoin(postMetadata, eq(posts.id, postMetadata.postId))
			.leftJoin(postTags, eq(postTags.postId, posts.id))
			.leftJoin(tags, eq(tags.id, postTags.tagId))
			.leftJoin(postStats, eq(postStats.postId, posts.id))
			.where(and(eq(posts.slug, slug), eq(posts.status, "published")))
			.groupBy(posts.id);

		if (!row) throw ApiError.notFound("Post not found");

		const { media: mediaRaw, tags: tagsRaw, ...post } = row;
		const media = parseMedia(mediaRaw);

		return ApiResponse.ok(c, "Post", {
			...post,
			tags: parseTags(tagsRaw),
			coverUrl: toUrl(media.cover, origin),
			thumbUrl: toUrl(media.thumb, origin)
		});
	})
	.get("/:slug/download", authMiddleware, async (c) => {
		const db = c.get("db");
		const user = c.get("user");
		const slug = c.req.param("slug");

		const [row] = await db
			.select({
				id: posts.id,
				slug: posts.slug,
				access: posts.access,
				assetKey: postAssets.key,
				assetFormat: postAssets.format
			})
			.from(posts)
			.innerJoin(
				postAssets,
				and(
					eq(postAssets.postId, posts.id),
					eq(postAssets.role, "asset")
				)
			)
			.where(and(eq(posts.slug, slug), eq(posts.status, "published")));

		if (!row) throw ApiError.notFound("Asset not found.");

		await Gate.assert("asset.download", {
			actor: user,
			resource: { access: row.access }
		});

		const object = await c.env.STORAGE.get(row.assetKey);
		if (!object) {
			if (c.env.APP_ENV !== "production") {
				const PLACEHOLDER: Record<string, string> = {
					jpg: "https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=1600&q=80&auto=format&fit=crop&dl=1",
					png: "https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=1600&q=80&auto=format&fit=crop&dl=1",
					mp4: "https://www.w3schools.com/html/mov_bbb.mp4",
					webm: "https://www.w3schools.com/html/mov_bbb.mp4"
				};
				const url = PLACEHOLDER[row.assetFormat] ?? PLACEHOLDER.mp4;
				return Response.redirect(url, 302);
			}
			throw ApiError.notFound("Asset file not found.");
		}

		const contentType =
			CONTENT_TYPES[row.assetFormat] ?? "application/octet-stream";

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
				"Content-Disposition": `attachment; filename="${row.slug}.${row.assetFormat}"`,
				"Cache-Control": "private, no-store"
			}
		});
	});

export default postsHandler;
