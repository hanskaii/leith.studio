import { and, eq, or, sql } from "drizzle-orm";
import {
	postMetadata,
	postTags,
	posts,
	tags,
	type DatabaseInstance
} from "@workspace/database";
import {
	buildSearchDocument,
	searchDocumentKey,
	type IndexablePost
} from "../lib/search-document";

/**
 * Cloudflare AI Search adapter. The ONLY entry point that talks to AI Search
 * or writes search documents to R2 — every other module calls through this
 * service so the integration surface stays narrow.
 *
 * Indexing strategy: write Markdown documents to R2 at `search/posts/{postId}.md`.
 * Cloudflare AI Search is configured to auto-crawl that prefix. We do NOT call
 * the AI Search items API directly — R2 is the source of truth, AI Search is
 * the index.
 *
 * If we later need real-time indexing, the `index` method is the single place
 * to layer in an items-API push on top of the R2 write.
 */
export class SearchService {
	constructor(private readonly env: CloudflareBindings) {}

	/**
	 * Write a post's search document to R2. Idempotent — overwriting an
	 * existing key is the same operation as creating a new one, so workflow
	 * retries and re-indexes are safe.
	 */
	async index(post: IndexablePost): Promise<void> {
		const key = searchDocumentKey(post.id);
		const body = buildSearchDocument(post);
		await (this.env as any).STORAGE.put(key, body, {
			httpMetadata: { contentType: "text/markdown" }
		});
	}

	/**
	 * Remove a post's search document. AI Search drops the corresponding
	 * index entry on its next crawl.
	 */
	async deindex(postId: string): Promise<void> {
		await (this.env as any).STORAGE.delete(searchDocumentKey(postId));
	}

	/**
	 * Run a semantic search via the AI Search binding. Returns ranked post
	 * ids with relevance scores. The caller is responsible for hydrating the
	 * posts from D1 and applying any additional filters (tag, type, etc.).
	 *
	 * The binding shape isn't fully stable in @cloudflare/workers-types yet,
	 * so we accept several likely signatures defensively:
	 *   - env.AI_SEARCH.search({ query, max_results })
	 *   - env.AI_SEARCH.get(name).search({ query, max_results })
	 * Result attributes are read from `attributes.postId` OR `metadata.postId`.
	 */
	async search(opts: { query: string; max?: number }): Promise<SearchHit[]> {
		const max = opts.max ?? 50;
		const binding = (this.env as any).AI_SEARCH;
		if (!binding) {
			throw new Error("AI_SEARCH binding is not configured");
		}

		let result: unknown;
		if (typeof binding.search === "function") {
			result = await binding.search({
				query: opts.query,
				max_results: max
			});
		} else if (typeof binding.get === "function") {
			const inst = binding.get("leith-posts");
			if (!inst || typeof inst.search !== "function") {
				throw new Error(
					"AI_SEARCH instance handle has no search() method"
				);
			}
			result = await inst.search({
				query: opts.query,
				max_results: max
			});
		} else {
			throw new Error(
				"AI_SEARCH binding shape is unrecognized — neither .search() nor .get() available"
			);
		}

		const data = (result as any)?.data ?? [];
		return data
			.map((d: any) => ({
				postId:
					d?.attributes?.postId ??
					d?.metadata?.postId ??
					d?.attributes?.post_id ??
					d?.metadata?.post_id,
				score: typeof d?.score === "number" ? d.score : 0
			}))
			.filter(
				(h: SearchHit) =>
					typeof h.postId === "string" && h.postId.length > 0
			);
	}

	/**
	 * Fallback when AI Search is unavailable. SQL `LIKE` against title and
	 * tag name. Returns up to 50 hits with synthetic descending scores so
	 * the caller can sort identically to the AI Search path.
	 *
	 * Lives on the same class so callers have one import for everything
	 * search-related, even though it doesn't actually touch `this.env`.
	 */
	async sqlFallback(db: DatabaseInstance, q: string): Promise<SearchHit[]> {
		const like = `%${q.toLowerCase()}%`;
		const rows = await db
			.select({ id: posts.id })
			.from(posts)
			.innerJoin(postMetadata, eq(postMetadata.postId, posts.id))
			.leftJoin(postTags, eq(postTags.postId, posts.id))
			.leftJoin(tags, eq(tags.id, postTags.tagId))
			.where(
				and(
					eq(posts.status, "published"),
					eq(postMetadata.processingStatus, "ready"),
					or(
						sql`LOWER(${posts.title}) LIKE ${like}`,
						sql`LOWER(${tags.name}) LIKE ${like}`
					)
				)
			)
			.groupBy(posts.id)
			.limit(50);

		return rows.map((r, i) => ({ postId: r.id, score: 50 - i }));
	}
}

export type SearchHit = { postId: string; score: number };
