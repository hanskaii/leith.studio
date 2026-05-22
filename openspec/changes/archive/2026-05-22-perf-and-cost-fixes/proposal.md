## Why

Several latent issues — a broken pagination path, missing client-side cache lifetimes, N+1 SQL patterns, and sequential I/O in hot paths — will compound into visible user-facing bugs and unnecessary Cloudflare spend as the catalog grows beyond a few dozen posts. Fixing them now, before traffic scales, costs a fraction of what they'd cost to debug under load.

## What Changes

- **FIX** `apps/web/src/routes/(app)/_home/feed/index.tsx`: pass the URL `page` param into `postsQueryOptions` instead of the hardcoded `1` — browse pages 2+ currently return empty results.
- **ADD** `staleTime` to `postsQueryOptions` (30 s), `tagsQueryOptions` (5 min), `postQueryOptions` (5 min), and `searchPostsQueryOptions` (1 min) so client-side navigation stops refetching on every mount.
- **FIX** `apps/api/src/handlers/posts.handler.ts`: replace the correlated `(SELECT COUNT(*) …)` subquery for `downloadCount` with a `LEFT JOIN` + `count()` in the existing `GROUP BY`, eliminating N extra D1 reads per page view.
- **FIX** `apps/api/src/handlers/creator.handler.ts` + `apps/api/src/workflows/studio-approve.workflow.ts`: batch the 3-per-tag D1 round-trips in `upsertPostTags` into a single bulk insert + one SELECT, dropping the sequential loop from 3N to 2 queries total.
- **FIX** `apps/api/src/handlers/studio.handler.ts` `POST /search/reindex`: replace sequential `await search.index()` calls with chunked `Promise.all` (chunks of 20) so the endpoint doesn't timeout on catalogs larger than ~300 posts.
- **FIX** `apps/api/src/handlers/files.handler.ts`: forward the `Range` request header to `c.env.STORAGE.get(key, { range })` and respond with `206 Partial Content` when a range is satisfied — video seeking in the browser player currently causes full re-downloads.
- **FIX** `apps/web/src/routes/(app)/_home/-components/search-dialog.tsx`: construct `coverThumb` as a full `/api/files/…` URL before rendering the `<img>` — the raw R2 key is currently used directly and images are broken for studio-approved posts.

## Capabilities

### New Capabilities

_(none — all changes are fixes to existing behaviour)_

### Modified Capabilities

- `content-library`: Query caching lifetimes are now defined (staleTime); pagination is correctly server-driven; `downloadCount` is computed via JOIN rather than correlated subquery; the files endpoint handles partial-content requests for video seeking; search dialog thumbnails render correctly.
- `search-index`: The reindex endpoint is parallelised in chunks and will no longer timeout on large catalogs.

## Impact

- `apps/web/src/routes/(app)/_home/feed/index.tsx` — pass `page` to query
- `apps/web/src/routes/-fn/posts.ts` — add `staleTime` to `postsQueryOptions`, `postQueryOptions`, `postStatsQueryOptions`
- `apps/web/src/routes/-fn/tags.ts` — add `staleTime` to `tagsQueryOptions`
- `apps/web/src/routes/-fn/search.ts` — add `staleTime` to `searchPostsQueryOptions`
- `apps/api/src/handlers/posts.handler.ts` — replace correlated subquery with LEFT JOIN count (all 3 occurrences)
- `apps/api/src/handlers/creator.handler.ts` — rewrite `upsertPostTags` to batch inserts
- `apps/api/src/workflows/studio-approve.workflow.ts` — rewrite inline `upsertPostTags` to batch inserts (or share the helper)
- `apps/api/src/handlers/studio.handler.ts` — parallelise reindex loop
- `apps/api/src/handlers/files.handler.ts` — add Range header forwarding + 206 response
- `apps/web/src/routes/(app)/_home/-components/search-dialog.tsx` — construct full coverThumb URL
