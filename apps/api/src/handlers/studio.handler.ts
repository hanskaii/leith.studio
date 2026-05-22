import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, eq, desc, sql } from "@workspace/database";
import {
	postMetadata,
	postTags,
	posts,
	studioGenerations,
	tags
} from "@workspace/database";
import { ApiResponse } from "../helpers/response.helper";
import { authMiddleware } from "../middleware/auth.middleware";
import { protect } from "../middleware/protect.middleware";
import { SearchService } from "../services/search.service";
import type { HonoEnv } from "../types/hono.types";

type TagRef = { slug: string; name: string };

function parseTagsJson(raw: string | null | undefined): TagRef[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as TagRef[]) : [];
	} catch {
		return [];
	}
}

const ApproveSchema = z.object({
	ids: z.array(z.string()).min(1),
	scheduledAt: z.string().datetime().optional()
});

const studioHandler = new Hono<HonoEnv>()
	.use("*", authMiddleware, protect("content.manage"))

	// ── Review ────────────────────────────────────────────────────────────────

	.get("/review", async (c) => {
		const db = c.get("db");
		const gens = await db.query.studioGenerations.findMany({
			where: eq(studioGenerations.status, "pending_review"),
			orderBy: desc(studioGenerations.createdAt)
		});
		return ApiResponse.ok(c, "ok", gens);
	})

	.post("/review/approve", zValidator("json", ApproveSchema), async (c) => {
		const { ids, scheduledAt } = c.req.valid("json");
		const user = c.get("user") as any;
		const results: { workflowId: string }[] = [];

		for (const generationId of ids) {
			const workflowId = `approve-${generationId}`;
			try {
				await c.env.STUDIO_APPROVE_WORKFLOW.create({
					id: workflowId,
					params: { generationId, userId: user.id, scheduledAt }
				});
				results.push({ workflowId });
			} catch {
				// already in flight
				results.push({ workflowId });
			}
		}

		return c.json(
			{ success: true, message: "Approval queued", data: results },
			202
		);
	})

	.post(
		"/review/reject",
		zValidator("json", z.object({ ids: z.array(z.string()).min(1) })),
		async (c) => {
			const db = c.get("db");
			const { ids } = c.req.valid("json");

			for (const genId of ids) {
				await db
					.update(studioGenerations)
					.set({ status: "rejected" })
					.where(eq(studioGenerations.id, genId));
			}

			return ApiResponse.ok(c, "Rejected");
		}
	)

	// ── Search Index ──────────────────────────────────────────────────────────

	/**
	 * Rebuild the search index from scratch. Walks every ready+published post,
	 * builds an IndexablePost from the joined row, and writes the markdown
	 * document to R2. Idempotent — safe to run repeatedly.
	 *
	 * Use cases:
	 *   - Document schema changed (new field added, format adjusted)
	 *   - R2 search/ prefix was wiped
	 *   - One-shot bootstrap on a fresh deployment
	 */
	.post("/search/reindex", async (c) => {
		const db = c.get("db");

		const rows = await db
			.select({
				id: posts.id,
				slug: posts.slug,
				title: posts.title,
				body: posts.body,
				publishedAt: posts.publishedAt,
				format: postMetadata.format,
				access: postMetadata.access,
				tags: sql<string>`COALESCE(
					JSON_GROUP_ARRAY(
						JSON_OBJECT('slug', ${tags.slug}, 'name', ${tags.name})
					) FILTER (WHERE ${tags.id} IS NOT NULL),
					'[]'
				)`
			})
			.from(posts)
			.innerJoin(postMetadata, eq(postMetadata.postId, posts.id))
			.leftJoin(postTags, eq(postTags.postId, posts.id))
			.leftJoin(tags, eq(tags.id, postTags.tagId))
			.where(
				and(
					eq(posts.status, "published"),
					eq(postMetadata.processingStatus, "ready")
				)
			)
			.groupBy(posts.id);

		const search = new SearchService(c.env);
		let indexed = 0;
		for (const row of rows) {
			await search.index({
				id: row.id,
				slug: row.slug,
				title: row.title,
				body: row.body,
				tags: parseTagsJson(row.tags),
				format: row.format,
				access: row.access as "free" | "premium",
				publishedAt: row.publishedAt ?? null
			});
			indexed++;
		}

		return ApiResponse.ok(c, "Search index rebuilt", { indexed });
	});

export default studioHandler;
