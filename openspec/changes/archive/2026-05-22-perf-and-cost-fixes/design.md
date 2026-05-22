## Context

The codebase has seven discrete inefficiencies that were identified during a cost and performance audit. They fall into three buckets:

1. **Client-side cache misses** — `staleTime: 0` on every query option means TanStack Query refetches on every component mount, even for data that rarely changes (tags, individual post detail).
2. **SQL anti-patterns** — a correlated subquery for `downloadCount` multiplies D1 row reads by N per page, and `upsertPostTags` issues 3 sequential D1 round-trips per tag instead of bulk-inserting.
3. **I/O correctness** — the files endpoint ignores the `Range` request header so video seeking forces a full file re-stream; the reindex endpoint awaits each R2 PUT sequentially and will time out past ~300 posts; the search dialog renders a raw R2 key as an image `src`.

None of these require schema changes. All fixes are isolated to the handler, query-options, or component layer.

## Goals / Non-Goals

**Goals:**

- Browse pagination works correctly at any catalog size
- Client-side navigation reuses cached data for stable endpoints (tags: 5 min, individual posts: 5 min, search: 1 min, feed pages: 30 s)
- `downloadCount` is computed in the SQL GROUP BY rather than as a correlated subquery
- `upsertPostTags` completes in 2 queries regardless of tag count
- `POST /search/reindex` completes within the 60-second Worker wall-clock budget for catalogs up to ~1 000 posts
- `GET /api/files/*` responds with `206 Partial Content` when a valid `Range` header is present
- Command palette thumbnails render for studio-approved posts

**Non-Goals:**

- Full CDN layer / Cache API for the files endpoint (separate performance change)
- Workers AI cost reduction / caching (separate change — needs product decision on opt-in enrichment)
- D1 query caching at the Workers layer
- Changes to the search ranking algorithm or AI Search binding

## Decisions

### 1. staleTime values

| Query                     | staleTime | Rationale                                                                       |
| ------------------------- | --------- | ------------------------------------------------------------------------------- |
| `tagsQueryOptions`        | 5 min     | Tags change only on new post publish — tolerate up to 5 min staleness           |
| `postQueryOptions`        | 5 min     | Individual post detail is immutable once published                              |
| `postStatsQueryOptions`   | 5 min     | Stat counts are approximate, don't need to be live                              |
| `postsQueryOptions`       | 30 s      | Feed should feel reasonably fresh; 30 s reduces repeated page-flip requests     |
| `searchPostsQueryOptions` | 1 min     | Search results can be short-lived but re-typing the same query should hit cache |

Alternative considered: `Infinity` for tags and individual posts. Rejected — invalidation on mutation isn't wired up project-wide yet, so a TTL is safer.

### 2. downloadCount — LEFT JOIN instead of correlated subquery

Replace:

```sql
(SELECT COUNT(*) FROM post_stats WHERE post_id = posts.id)
```

With:

```sql
COUNT(post_stats.id)  -- in the GROUP BY that already exists
```

The posts handler already LEFT JOINs `postTags` and `tags`; adding `LEFT JOIN postStats` on the same query adds one join and moves the count into the existing aggregation. The correlated subquery variant re-executes for every row; the JOIN variant aggregates once.

Alternative considered: materialised view / cached count column on `postMetadata`. Rejected — adds write complexity for a problem that a JOIN already solves cleanly.

### 3. upsertPostTags — bulk approach

Current: `for each tag → INSERT tags → SELECT id → INSERT postTags` (3 × N sequential awaits).

New approach:

1. Build all `{id, slug, name}` objects up front, bulk-insert into `tags` with `onConflictDoNothing`
2. One `SELECT id, slug FROM tags WHERE slug IN (...)` to get canonical IDs (handles conflict path)
3. Bulk-insert all `postTags` rows with `onConflictDoNothing`

Total: **2 queries** regardless of tag count. The slug `IN (...)` clause is safe because tag lists are small (max ~6 entries per post).

Both the `creator.handler.ts` helper function and the inline loop inside `studio-approve.workflow.ts` need updating. The cleanest approach is to keep `upsertPostTags` as a standalone async function in `creator.handler.ts` and import it from the workflow — but the workflow lives in a different compilation unit. Instead, duplicate the function body inline in the workflow (it's short) and leave a `// TODO: share` comment.

Alternative considered: D1 batch API. The `db.batch([...])` API is available but returns results as an array of QueryResults that require index-based access — harder to read and no performance advantage over 2 clean queries at this tag count.

### 4. Reindex parallelisation — chunked Promise.all

Replace the sequential `for await` loop with:

```ts
const CHUNK = 20;
for (let i = 0; i < rows.length; i += CHUNK) {
  await Promise.all(rows.slice(i, i + CHUNK).map(row => search.index({...})));
}
```

Chunk size 20: R2 PUT operations are I/O-bound and independent. 20 concurrent PUTs is conservative — R2 has no documented per-Worker concurrency limit, but 20 avoids saturating the Worker's connection pool and keeps per-chunk latency under ~2 s even for slow regions. At 1 000 posts: 50 chunks × ~2 s = ~100 s — still over the 60 s limit.

For the current catalog (expected < 300 posts), 15 chunks × ~2 s = ~30 s, well within budget.

If catalog grows beyond 500, the reindex endpoint needs to become a Workflow (durable, resumable). That's a future change.

### 5. Range header forwarding in files handler

R2's `.get(key, { range })` accepts a `{ offset, length }` object or a parsed HTTP Range header via `parseHttpRange()`. Cloudflare's R2 SDK exposes `R2ObjectBody.range` on the response to confirm what range was served.

Implementation:

```ts
const rangeHeader = c.req.header("Range");
const range = rangeHeader ? { suffix: ..., offset: ..., length: ... } : undefined;
const object = await c.env.STORAGE.get(key, range ? { range } : undefined);
// status = range && object.range ? 206 : 200
```

The `Range` header parsing needs to handle `bytes=start-end`, `bytes=start-`, `bytes=-suffix`. Use a simple parser rather than pulling in an npm dependency.

Response must include `Content-Range: bytes start-end/total` and `Accept-Ranges: bytes` headers for the browser video player to seek correctly.

### 6. coverThumb URL construction in search dialog

`posts.coverThumb` stores the raw R2 object key (`posts/thumbnail/{id}.jpg`). The files endpoint is at `/api/files/*`. The search dialog runs in the browser — it has access to the current origin. Construct the URL as:

```ts
const thumbUrl = post.coverThumb
	? `${window.location.origin}/api/files/${post.coverThumb}`
	: null;
```

Alternative: store full URLs in the DB. Rejected — R2 keys are portable across environments; baking in `origin` at write time would break dev/staging/prod parity.

## Risks / Trade-offs

| Risk                                                                         | Mitigation                                                                                               |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `staleTime` means a user sees stale tag counts after a new post is published | Acceptable — tags are a browse aid, not a transactional surface. A hard refresh always shows fresh data. |
| Chunked reindex still times out for very large catalogs                      | Document 500-post limit; convert to Workflow when catalog grows                                          |
| Range parser edge cases (malformed header, multi-range)                      | Ignore malformed headers (fall back to full response); decline multi-range (return 200 full)             |
| LEFT JOIN on `postStats` increases join cardinality                          | `postStats` rows are bounded by download events per post; GROUP BY `posts.id` collapses them correctly   |

## Migration Plan

No data migrations. No schema changes. All changes are:

- Server handler modifications (deployed atomically with the Worker)
- Client query option changes (deployed with the web build)

Rollback: revert the commit; both Worker and web build are independently deployable.
