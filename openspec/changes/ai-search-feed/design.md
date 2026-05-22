> **Implementation note:** What this document calls `indexPost(env, ...)`,
> `deindexPost(env, ...)`, `searchPosts(env, ...)`, and `sqlSearchFallback(db, q)`
> were implemented as methods on a `SearchService` class at
> `apps/api/src/services/search.service.ts` to match the project's existing
> service-class convention (`UploadService`, `VioService`, `AuthService`).
> Call sites read `new SearchService(env).index(post)` etc. — behavior is
> identical to the function-style design described below.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Indexing path (write)                                      │
│                                                             │
│  StudioApproveWorkflow             Creator CRUD             │
│    └─ index-search step              └─ POST/PATCH/DELETE   │
│         │                                  │                │
│         ▼                                  ▼                │
│              indexPost(env, post)                           │
│                    │                                        │
│                    ▼                                        │
│         R2: search/posts/{postId}.md                        │
│         (Markdown + YAML front matter)                      │
│                    │                                        │
│                    ▼  (Cloudflare auto-crawl)              │
│         Cloudflare AI Search index "leith-posts"            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Query path (read)                                          │
│                                                             │
│  Web feed: ?q=moody+rain&tag=loop                           │
│         │                                                   │
│         ▼                                                   │
│  GET /api/v1/posts?q=...&tag=...                            │
│         │                                                   │
│   ┌─────┴─────┐                                             │
│   │           │                                             │
│   ▼           ▼                                             │
│ q absent    q present                                       │
│   │           │                                             │
│   │           ▼                                             │
│   │   env.AI_SEARCH.search({ query, max: 50 })              │
│   │           │                                             │
│   │           ▼  ranked [{postId, score}, ...]              │
│   │           │                                             │
│   ▼           ▼                                             │
│   SQL SELECT  SQL SELECT WHERE id IN (...) + tag filter     │
│         │           │                                       │
│         ▼           ▼ re-sort by AI Search rank             │
│        items       items                                    │
└─────────────────────────────────────────────────────────────┘
```

## Why R2 as the index source

Cloudflare AI Search supports three input modes: Items API (push individual files), web crawler, and R2 auto-crawl. We choose R2 because:

1. **R2 is the source of truth** — we already store assets there; adding a `search/posts/` prefix is incremental, no new service.
2. **Idempotent overwrites** — `PUT search/posts/{postId}.md` is the same operation for new posts and edits. Equivalent on Items API would need separate `create` vs `update` calls.
3. **Crash recovery** — if the AI Search index is ever rebuilt from scratch, R2 holds the documents needed to re-populate it. No code path needs to "find all indexable posts" — the answer is "list R2 under `search/posts/`".
4. **Documents are inspectable** — the team can `wrangler r2 object get search/posts/abc.md` to debug ranking.
5. **No special API binding required for writes** — `env.STORAGE.put()` is already used everywhere. The AI Search binding is only needed at query time.

The trade-off is **indexing latency** — AI Search auto-crawl runs on its own schedule (Cloudflare doesn't expose a manual trigger from a Worker as of this writing). A newly-created post may take a few minutes to become searchable. That's acceptable because most search use is across the existing library, not the post created 30 seconds ago.

If real-time indexing becomes a requirement, we can layer the Items API on top later — `indexPost` would do BOTH a `STORAGE.put` AND an Items API call. The R2 write stays as the durable source.

## Search Document Schema

`apps/api/src/lib/search-document.ts`:

```typescript
type IndexablePost = {
	id: string;
	slug: string;
	title: string;
	body: string; // already an enriched description (from ai-enrich)
	tags: { slug: string; name: string }[];
	format: string; // "mp4" | "jpg" | etc.
	access: "free" | "premium";
	publishedAt: Date | null;
};

export function buildSearchDocument(post: IndexablePost): string {
	const tagNames = post.tags.map((t) => t.name).join(", ");
	const type = ["mp4", "webm"].includes(post.format)
		? "video"
		: ["mp3", "wav", "ogg", "aac"].includes(post.format)
			? "audio"
			: "image";

	// YAML front matter is read by the AI Search crawler as structured
	// metadata and made queryable via metadata filters. The Markdown body is
	// the text that gets embedded for semantic ranking.
	return `---
postId: ${post.id}
slug: ${post.slug}
type: ${type}
access: ${post.access}
tags: [${post.tags.map((t) => t.slug).join(", ")}]
publishedAt: ${post.publishedAt?.toISOString() ?? "null"}
---

# ${post.title}

${post.body}

Tags: ${tagNames}
`;
}

export function searchDocumentKey(postId: string): string {
	return `search/posts/${postId}.md`;
}
```

The front matter holds **identifiers and filters** (postId for joining back to D1; tags/type/access as potential metadata filters in future). The body holds **rankable text** (title + description + tag names spelled out). Tag names appear both in the front matter (machine) and in the body (human-rankable text) — that's intentional: it makes searches like `"loop"` find loop-tagged content even when the title doesn't say "loop".

## Index Adapter

`apps/api/src/lib/search-index.ts` is the only file that talks to Cloudflare AI Search APIs. Keeping it isolated means we can:

- Mock it for tests
- Swap to Items API later without touching call sites
- Add caching or retry logic in one place

```typescript
export async function indexPost(
	env: { STORAGE: R2Bucket; AI_SEARCH?: unknown },
	post: IndexablePost
): Promise<void> {
	const key = searchDocumentKey(post.id);
	const body = buildSearchDocument(post);
	await env.STORAGE.put(key, body, {
		httpMetadata: { contentType: "text/markdown" }
	});
	// Note: we do NOT call AI Search's items API here. The crawler picks it
	// up. If/when we add real-time indexing, this is the place.
}

export async function deindexPost(
	env: { STORAGE: R2Bucket },
	postId: string
): Promise<void> {
	await env.STORAGE.delete(searchDocumentKey(postId));
}

export type SearchHit = { postId: string; score: number };

export async function searchPosts(
	env: { AI_SEARCH: any },
	opts: { query: string; max?: number }
): Promise<SearchHit[]> {
	// Cloudflare AI Search binding shape (subject to runtime verification).
	// The adapter tolerates a few likely-existing call signatures so the
	// caller doesn't need to be re-touched when the SDK shape settles.
	const max = opts.max ?? 50;

	const result = await env.AI_SEARCH.search({
		query: opts.query,
		max_results: max
	});

	// The result shape from Cloudflare is expected to be:
	//   { data: [{ attributes: { postId, ... }, score, ... }, ...] }
	// We extract postId from the YAML front matter (auto-parsed into
	// attributes by the AI Search crawler) and the relevance score.
	const data = (result as any)?.data ?? [];
	return data
		.map((d: any) => ({
			postId: d?.attributes?.postId ?? d?.metadata?.postId,
			score: d?.score ?? 0
		}))
		.filter((h: SearchHit) => typeof h.postId === "string");
}
```

The function signature is deliberately narrow: input is the user's query string, output is `{ postId, score }[]`. Filtering, sorting, joining back to D1 — all happens in the handler, not here.

## Feed Handler — Branching on `q`

`apps/api/src/handlers/posts.handler.ts` `GET /`:

```typescript
const page = Number(c.req.query("page") ?? "1");
const tag = c.req.query("tag");
const q = c.req.query("q")?.trim();

if (q) {
	// Search path: AI Search ranks, SQL filters + hydrates, JS re-sorts.
	let hits: SearchHit[] = [];
	try {
		hits = await searchPosts(c.env, { query: q, max: 50 });
	} catch (err) {
		console.error("[search] AI Search failed, falling back to LIKE", err);
		// Fallback path — see below. Still returns ranked results, just
		// using SQL LIKE instead of semantic search.
		hits = await sqlSearchFallback(db, q);
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

	// Hydrate: same SELECT as the no-q path, but with id IN (...) and
	// optional tag filter on top.
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

	const rows = await db
		.select({
			/* same projection as today */
		})
		.from(posts)
		.innerJoin(postMetadata, eq(posts.id, postMetadata.postId))
		.leftJoin(postTags, eq(postTags.postId, posts.id))
		.leftJoin(tags, eq(tags.id, postTags.tagId))
		.where(
			and(
				eq(posts.status, "published"),
				eq(postMetadata.processingStatus, "ready"),
				inArray(posts.id, idsByRank),
				tagFilter
			)
		)
		.groupBy(posts.id);

	// Re-sort by AI Search rank (the SQL result is unordered after the
	// IN clause). Posts that survived the tag filter keep their rank.
	const items = rows
		.map((r) => ({
			...r,
			tags: parseTags(r.tags),
			previewUrl: r.previewKey
				? `${origin}/api/files/${r.previewKey}`
				: null,
			clipUrl: r.clipKey ? `${origin}/api/files/${r.clipKey}` : null
		}))
		.sort((a, b) => {
			const ai = rankIndex.get(a.id) ?? Infinity;
			const bi = rankIndex.get(b.id) ?? Infinity;
			return ai - bi;
		});

	return ApiResponse.ok(c, "Posts", {
		items,
		total: items.length,
		page: 1,
		pageSize: items.length
	});
}

// q absent → existing pure-SQL path, no change
```

Key invariants:

- **Tag filter is layered on top of search results, not pushed into AI Search.** The SQL tag relation is authoritative; AI Search just provides candidate IDs.
- **Rank is preserved by sorting AFTER the SQL join.** SQLite `IN` returns unordered rows; we re-sort in JS against the `rankIndex` map.
- **Pagination collapses when searching.** `page` and `pageSize` are set so the frontend understands "this is the full result set". If we ever want paginated search, we can chunk the post IDs and run multiple queries — but 50 results is plenty for our use case.

## SQL Fallback

When the AI Search binding is missing or throws, we still want the feature to work. The fallback is the simplest possible thing — `LIKE` on title and tag name — which matches today's behavior:

```typescript
async function sqlSearchFallback(
	db: DatabaseInstance,
	q: string
): Promise<SearchHit[]> {
	const like = `%${q}%`;
	const rows = await db
		.select({ id: posts.id })
		.from(posts)
		.leftJoin(postTags, eq(postTags.postId, posts.id))
		.leftJoin(tags, eq(tags.id, postTags.tagId))
		.where(
			and(
				eq(posts.status, "published"),
				or(
					sql`LOWER(${posts.title}) LIKE LOWER(${like})`,
					sql`LOWER(${tags.name}) LIKE LOWER(${like})`
				)
			)
		)
		.groupBy(posts.id)
		.limit(50);
	return rows.map((r, i) => ({ postId: r.id, score: 50 - i }));
}
```

Score is synthetic (descending by SQL order) — it's only used by the caller to preserve order. Users notice degraded result quality, not a broken page.

## Studio Approve Workflow — `index-search` Step

Inserted between `upsert-tags` and `trigger-video-processing`:

```typescript
currentStepName = "index-search";
await step.do("index-search", async () => {
	await indexPost(this.env, {
		id: postId,
		slug: created.slug,
		title: enriched.title,
		body: enriched.description,
		tags: enriched.tags.map((name) => ({
			slug: slugifyTag(name),
			name
		})),
		format: videoFileKey ? "mp4" : "jpg",
		access: "premium",
		publishedAt: scheduledAt ? new Date(scheduledAt) : null
	});
});
```

Idempotent: rerunning the step issues `STORAGE.put` with the same key — R2 overwrites. The workflow's retry semantics are safe.

This step is **not** wrapped in a try/catch that swallows errors. If R2 is down, the workflow fails and rolls back via the existing error path — better than silently shipping an un-indexed post.

## Creator Handler — Hook Points

```typescript
// POST /posts (create)
await db.insert(posts).values(post);
await upsertPostTags(db, postId, data.tags ?? []);
await indexPost(c.env, {
	id: postId,
	slug,
	title: data.title,
	body: data.body,
	tags: /* fetch the just-inserted joined tags */,
	format: data.format ?? "mp4",
	access: data.access ?? "premium",
	publishedAt: null
});

// PATCH /posts/:id (update)
// After the update transaction + tag replacement, fetch the fresh row
// and re-index. R2 PUT overwrites the old document.
await indexPost(c.env, freshlyFetchedRow);

// DELETE /posts/:id
await db.delete(posts).where(eq(posts.id, id));
await deindexPost(c.env, id);
```

The fetch-then-index pattern in PATCH costs one extra SQL roundtrip — acceptable for an admin route. The alternative (pass partial fields and merge with the existing row) is more error-prone.

## Wrangler Binding

`apps/api/wrangler.jsonc`:

```jsonc
"ai_search": [
  {
    "binding": "AI_SEARCH",
    "index_name": "leith-posts"
  }
]
```

The `index_name` must match an AI Search instance created in the Cloudflare dashboard. The instance must be configured to crawl the `leith` R2 bucket with object key prefix `search/posts/`. This is one-time manual setup documented in tasks.md, since the dashboard configuration isn't drivable from Wrangler in our toolchain version.

## Backfill

`pnpm db:seed` already runs the seeder. The new `search-index.ts` seed iterates `posts WHERE status='published'`, builds documents, and writes them to R2. Running `db:seed` after this change lands gives a fully-indexed local environment with no extra commands.

For production, the `POST /api/v1/studio/search/reindex` endpoint (or a separate admin handler — TBD by where it fits) walks the same query and re-indexes. This is the recovery path if the R2 prefix is ever wiped or the document schema changes.

## Feed Frontend Changes

```typescript
// apps/web/src/routes/-fn/posts.ts
export const postsQueryOptions = (page = 1, tag?: string, q?: string) =>
	queryOptions({
		queryKey: ["posts", page, tag, q],
		queryFn: () => getPostsFn({ data: { page, tag, q } })
	});
```

```typescript
// apps/web/src/routes/(app)/_home/feed/index.tsx
const { data } = useSuspenseQuery(postsQueryOptions(1, tag, q));
```

When `q` is set, the server returns a single page of up to 50 ranked items. The pagination UI is suppressed:

```tsx
{!q && totalPages > 1 && <Pagination ... />}
```

The in-component `q` filter (line 78–84 today) is removed — server results are already filtered and ranked. The `type` (video/image/all) and `sort` (newest/popular) controls stay client-side for now; they operate on whatever set comes back. (A future change can move those server-side too if needed.)

## Command Palette (Cmd+K)

The global command palette (`apps/web/src/routes/-components/providers/modal-provider.tsx` holds the `searchOpen` state; `apps/web/src/routes/(app)/_home/-components/search-dialog.tsx` renders it) is currently a tag browser only. After this change it becomes the primary semantic search surface.

```
┌────────────────────────────────────────────────────────────┐
│ ⌘K                                                         │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 🔍  moody rain                                         │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ RESULTS                                                    │
│  ▸ [thumb] Noir Rain Loop          · Loop                  │
│  ▸ [thumb] Obsidian Fog            · Ambience              │
│  ▸ [thumb] Storm Transition        · Transition            │
│                                                            │
│ BROWSE BY TAG  (shown only when input is empty)            │
│  • Loop  • Ambience  • Background  • Transition  …         │
└────────────────────────────────────────────────────────────┘
```

### Data flow

```
User types in palette input
      │  debounce 250ms
      ▼
useQuery(searchPostsQueryOptions(q))   enabled: q.length > 1
      │
      ▼
searchPostsFn — calls GET /api/v1/posts?q=<query>
      │  (same endpoint as the feed page, returns top-50 ranked)
      ▼
Results rendered as CommandItem rows
      │
User clicks row → navigate({ to: "/feed/$slug", params: { slug } })
                 closeSearch()
```

### Why reuse `GET /api/v1/posts` and not a separate endpoint

- Same ranking, same semantics. If the feed returns "Noir Rain Loop" first for `"moody rain"`, the palette returns the same first result.
- One endpoint = one cache layer (TanStack Query keys `["posts", 1, tag, q]`). Typing the same query in the feed URL bar and in the palette hits the cache.
- Less surface to maintain — no parallel `/search` route to keep in sync with the index schema.

The minor cost: the palette pulls down the full post payload (with `coverThumb`, `format`, etc.) when it really only needs `slug`, `title`, and `tags[0]`. That's a few KB per request — acceptable for an admin-grade lookup tool. If it ever matters, we can add a `?fields=slim` query param later.

### `search-dialog.tsx` shape

```tsx
const [input, setInput] = useState("");
const debouncedQ = useDebouncedValue(input.trim(), 250);
const { data, isLoading } = useQuery(searchPostsQueryOptions(debouncedQ));
const tagList = useQuery(tagsQueryOptions()).data ?? [];

const results = data?.items ?? [];
const showTags = debouncedQ.length <= 1;

return (
	<CommandDialog open={searchOpen} onOpenChange={(o) => !o && closeSearch()}>
		<CommandInput
			placeholder="Search by vibe… moody rain, golden warmth"
			value={input}
			onValueChange={setInput}
		/>
		<CommandList>
			{isLoading && <CommandLoading>Searching…</CommandLoading>}
			<CommandEmpty>
				{debouncedQ.length > 1
					? `No matches for "${debouncedQ}".`
					: "Type to search, or pick a tag below."}
			</CommandEmpty>

			{results.length > 0 && (
				<CommandGroup heading="Results">
					{results.slice(0, 8).map((post) => (
						<CommandItem
							key={post.id}
							value={post.slug}
							onSelect={() => {
								closeSearch();
								navigate({
									to: "/feed/$slug",
									params: { slug: post.slug }
								});
							}}
						>
							<img
								src={post.coverThumb ?? ""}
								alt=""
								className="h-8 w-12 …"
							/>
							<span className="truncate">{post.title}</span>
							{post.tags[0] && (
								<span className="ml-auto text-xs text-muted-foreground">
									{post.tags[0].name}
								</span>
							)}
						</CommandItem>
					))}
				</CommandGroup>
			)}

			{showTags && tagList.length > 0 && (
				<CommandGroup heading="Browse by tag">
					{tagList.map((tag) => (
						<CommandItem
							key={tag.slug}
							value={tag.name}
							onSelect={() => {
								closeSearch();
								navigate({
									to: "/feed",
									search: {
										page: 1,
										tag: tag.slug,
										type: "all",
										sort: "newest"
									}
								});
							}}
						>
							{tag.name}
						</CommandItem>
					))}
				</CommandGroup>
			)}
		</CommandList>
	</CommandDialog>
);
```

A small `useDebouncedValue` hook lands alongside (`apps/web/src/lib/hooks.ts` or co-located in `-fn/search.ts`) — trivial, but worth naming so other typeahead inputs can reuse it.

### Disabling cmdk's built-in filter

`cmdk` (the library `CommandDialog` wraps) filters items client-side by default — matching item `value` against input text. With server-side search that's wrong: we already have ranked results from AI Search, and cmdk's substring filter would re-rank or hide them.

The fix is `<Command shouldFilter={false}>` on the dialog root. We trust the server's ranking and render the result list verbatim.

```tsx
<CommandDialog shouldFilter={false} open={searchOpen} ...>
```

## Why we don't push tag filter into AI Search

The proposal mentions this — design rationale:

- The SQL relation is **authoritative** — the `tags` table is the source of truth for what's tagged what. AI Search documents are derived from D1; if they ever drift (mid-crawl, stale R2 doc), the SQL filter still returns correct results.
- The tag filter is a **set operation**, not a ranking concern. Set ops belong in SQL.
- The SQL filter is already efficient (indexed FK lookup). No performance gain from re-implementing it.
- Keeping the tag filter in one place (SQL) means tag UX behavior is consistent whether or not search is active.

## Failure Modes

| Scenario                                                 | Behavior                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| AI Search binding missing                                | Fallback to SQL `LIKE` automatically                                                             |
| AI Search returns 500                                    | Same — caught by try/catch in handler, SQL fallback fires                                        |
| Post indexed but AI Search hasn't crawled yet            | Search misses the post for a few minutes — acceptable                                            |
| R2 PUT fails during workflow                             | Workflow errors, agent reverts status, admin can retry                                           |
| Document schema drift (we add a field, old docs lack it) | Old documents still rank — the new field is just absent until next crawl after we re-run reindex |
| Tag filter excludes all search hits                      | Empty result set with a clear "no results" empty state                                           |

## Open Questions Captured

- **Exact `env.AI_SEARCH.search()` signature** — assumed `{ query, max_results }` returning `{ data: [{ attributes, score }] }`. The adapter (`searchPosts`) handles two field-name variants (`attributes.postId` vs `metadata.postId`). Will verify against Cloudflare types at implementation time and tighten the adapter once confirmed.
- **AI Search crawl cadence** — not Worker-controllable from what we know. May warrant a manual "force re-crawl" admin button later if dashboard exposes it.
