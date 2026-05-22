## 1. Client-Side Cache Lifetimes (staleTime)

- [x] 1.1 In `apps/web/src/routes/-fn/tags.ts`, add `staleTime: 5 * 60 * 1000` to `tagsQueryOptions`.
- [x] 1.2 In `apps/web/src/routes/-fn/posts.ts`, add `staleTime: 30 * 1000` to `postsQueryOptions`, `staleTime: 5 * 60 * 1000` to `postQueryOptions`, and `staleTime: 5 * 60 * 1000` to `postStatsQueryOptions`.
- [x] 1.3 In `apps/web/src/routes/-fn/search.ts`, add `staleTime: 60 * 1000` to `searchPostsQueryOptions`.

## 2. Feed Pagination Fix

- [x] 2.1 In `apps/web/src/routes/(app)/_home/feed/index.tsx`, change `postsQueryOptions(1, tag, q)` to `postsQueryOptions(page, tag, q)` in `FeedItems`. The `page` prop is already in scope. _Also dropped the client-side `filtered.slice()` pagination — server now returns the correct page slice, `totalPages` derived from `data.total`._

## 3. downloadCount — Replace Correlated Subquery with LEFT JOIN

- [x] 3.1 In `apps/api/src/handlers/posts.handler.ts` `GET /` (browse path), remove the `sql<number>\`(SELECT COUNT(\*)…)\``field and instead`LEFT JOIN postStats`after the existing tags joins, adding`downloadCount: count(postStats.id)`to the SELECT. Add`postStats`to the existing imports from`@workspace/database`.
- [x] 3.2 Apply the same LEFT JOIN change to the `GET /` **search path** `searchRows` query in the same file.
- [x] 3.3 Apply the same LEFT JOIN change to `GET /:slug` single-post query in `posts.handler.ts`.
- [x] 3.4 ~~Apply the same LEFT JOIN change to the `updatedRow` SELECT in `apps/api/src/handlers/creator.handler.ts` `PATCH /posts/:id`.~~ — N/A: the PATCH `updatedRow` SELECT does not request `downloadCount`, so there is no correlated subquery to replace.

## 4. upsertPostTags — Bulk in 2 Queries

- [x] 4.1 In `apps/api/src/handlers/creator.handler.ts`, rewrite `upsertPostTags(db, postId, tagNames)` to:
    - Build an array of `{ id: crypto.randomUUID(), slug, name, createdAt }` objects for each valid tag slug
    - Bulk-insert all into `tags` with `.onConflictDoNothing()` in one query
    - `SELECT id, slug FROM tags WHERE slug IN (…slugs…)` to get canonical IDs
    - Bulk-insert all `{ postId, tagId }` rows into `postTags` with `.onConflictDoNothing()` in one query
- [x] 4.2 In `apps/api/src/workflows/studio-approve.workflow.ts`, rewrite the inline `upsert-tags` step body using the same 2-query pattern (bulk insert tags → select ids → bulk insert postTags). Import `inArray` from `@workspace/database` if not already present.

## 5. Reindex Endpoint — Parallelise in Chunks

- [x] 5.1 In `apps/api/src/handlers/studio.handler.ts` `POST /search/reindex`, replace the `for (const row of rows) { await search.index({...}) }` sequential loop with chunked `Promise.all`:
    ```ts
    const CHUNK = 20;
    for (let i = 0; i < rows.length; i += CHUNK) {
      await Promise.all(rows.slice(i, i + CHUNK).map(row => search.index({...})));
      indexed += Math.min(CHUNK, rows.length - i);
    }
    ```
    Move `indexed` counter update inside the loop.

## 6. Files Endpoint — Range Header Support

- [x] 6.1 In `apps/api/src/handlers/files.handler.ts`, add a `parseRange(header: string, size: number)` helper that parses a `bytes=start-end`, `bytes=start-`, or `bytes=-suffix` Range header into `{ offset: number, length: number } | null`. Return `null` for malformed or multi-range headers.
- [x] 6.2 In the handler body, read `c.req.header("Range")` and parse it using the helper. Pass `{ range: { offset, length } }` as the second argument to `c.env.STORAGE.get(key, ...)` when a valid range is present.
- [x] 6.3 Set response status to `206` when a range was satisfied. Include headers: `Content-Range: bytes {start}-{end}/{total}`, `Accept-Ranges: bytes`, and `Content-Length: {length}`. Keep `Content-Type` and `Cache-Control` as-is.
- [x] 6.4 When no `Range` header is present (or it was malformed), return `200 OK` with the full object body and add `Accept-Ranges: bytes` to the response headers.

## 7. Search Dialog — Construct Full coverThumb URL

- [x] 7.1 In `apps/web/src/routes/(app)/_home/-components/search-dialog.tsx`, before the `results.slice(0, 8).map(...)` block, derive the origin from `window.location.origin`. For each `post`, compute `const thumbUrl = post.coverThumb ? \`\${origin}/api/files/\${post.coverThumb}\` : null`and use`thumbUrl`as the`<img src>`instead of`post.coverThumb`.

## 8. Verification

- [ ] 8.1 Browse feed page 1, then click page 2 — confirm the grid shows different posts (requires at least 13 published posts; seed or approve more if needed).
- [ ] 8.2 Open DevTools Network tab; navigate feed → post detail → back within 30 s — confirm no `GET /api/v1/posts` or `GET /api/v1/tags` requests appear on the back navigation.
- [ ] 8.3 Open Cmd+K palette, navigate away, re-open within 5 min — confirm no `/api/v1/tags` request fires.
- [ ] 8.4 Hit `GET /api/v1/posts?page=1` and check the `downloadCount` field is present and numeric (≥ 0).
- [ ] 8.5 Call `POST /api/v1/studio/search/reindex` — confirm it returns `{ indexed: N }` in well under 60 s and logs no timeout error.
- [ ] 8.6 Using a tool like `curl -r 0-99 /api/files/posts/video/{id}.mp4` — confirm status 206 and `Content-Range` header is returned.
- [ ] 8.7 Open command palette, type a query that returns studio-approved posts — confirm thumbnails render (no broken image icons).
