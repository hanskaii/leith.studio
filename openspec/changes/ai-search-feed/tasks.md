## 0. Cloudflare Setup (manual, one-time)

- [ ] 0.1 In the Cloudflare dashboard, create an AI Search instance named `leith-posts`. Configure it to crawl the `leith` R2 bucket with object key prefix `search/posts/`. Note the instance name — it goes in `wrangler.jsonc`.
- [ ] 0.2 Verify the AI Search Workers binding API shape in the runtime types. Once `wrangler types` regenerates `CloudflareBindings`, inspect the `AI_SEARCH` field to confirm whether `search()` is called directly on the binding or through `.get("instance")`. Update `apps/api/src/services/search.service.ts` (`searchPosts` adapter) if the actual signature differs from the assumed `env.AI_SEARCH.search({ query, max_results })`.

## 1. Wrangler binding

- [x] 1.1 In `apps/api/wrangler.jsonc`, add an `ai_search` array with one entry: `{ "binding": "AI_SEARCH", "index_name": "leith-posts" }`.
- [x] 1.2 Run `pnpm -F api cf-typegen` (or whatever the project's typegen script is) so `CloudflareBindings` picks up the new `AI_SEARCH` field.
- [x] 1.3 If `HonoEnv` in `apps/api/src/types/hono.types.ts` doesn't already type bindings through `CloudflareBindings`, add `AI_SEARCH: AISearch` to the `Bindings` interface — type-imported from `@cloudflare/workers-types` if available, otherwise `any` with a TODO.

## 2. Search document layer

- [x] 2.1 Create `apps/api/src/lib/search-document.ts` exporting `buildSearchDocument(post: IndexablePost): string` and `searchDocumentKey(postId: string): string`. The document is Markdown with a YAML front matter block holding `postId`, `slug`, `type` (derived from format), `access`, `tags` (slug list), and `publishedAt` (ISO). The body is `# {title}\n\n{description}\n\nTags: {comma-separated tag names}`.
- [x] 2.2 Add a `type IndexablePost = { id, slug, title, body, tags: { slug, name }[], format, access, publishedAt }` exported from the same file.

## 3. Search index adapter

- [x] 3.1 Create `apps/api/src/services/search.service.ts` exporting `indexPost(env, post)`, `deindexPost(env, postId)`, and `searchPosts(env, { query, max })`.
- [x] 3.2 `indexPost` — call `env.STORAGE.put(searchDocumentKey(post.id), buildSearchDocument(post), { httpMetadata: { contentType: "text/markdown" } })`. No AI Search SDK call here — R2 is the source, AI Search crawls.
- [x] 3.3 `deindexPost` — call `env.STORAGE.delete(searchDocumentKey(postId))`.
- [x] 3.4 `searchPosts` — call `env.AI_SEARCH.search({ query, max_results: max ?? 50 })`. Map result to `{ postId, score }[]` by reading `attributes.postId ?? metadata.postId` defensively. Filter out hits without a `postId`.
- [x] 3.5 Add a `sqlSearchFallback(db, q)` function in the same file (or a separate `lib/search-fallback.ts`): SQL `LIKE` on `posts.title` OR `tags.name`, GROUP BY post id, LIMIT 50, return as `{ postId, score: 50 - index }[]`. The synthetic score preserves rank when the caller sorts.

## 4. Posts handler — branch on `q`

- [x] 4.1 In `apps/api/src/handlers/posts.handler.ts` `GET /`, read `c.req.query("q")?.trim()`. If absent, run the existing SQL path unchanged.
- [x] 4.2 If `q` is present: try `searchPosts(c.env, { query: q, max: 50 })`; on throw, log `"[search] AI Search failed, falling back to LIKE"` and call `sqlSearchFallback(db, q)`. Either branch returns `SearchHit[]`.
- [x] 4.3 If `hits.length === 0`: return `{ items: [], total: 0, page: 1, pageSize: 50 }` early.
- [x] 4.4 Build `idsByRank = hits.map(h => h.postId)` and `rankIndex = new Map(idsByRank.map((id, i) => [id, i]))`.
- [x] 4.5 SELECT posts WHERE `id IN (idsByRank)`, status published, processingStatus ready, plus the existing tag subquery if `?tag=` is set, JOIN postMetadata + tags aggregate. Same projection as the no-q branch.
- [x] 4.6 Re-sort the SELECT result in JS by `rankIndex.get(row.id) ?? Infinity`. This preserves AI Search rank after SQL filtering scrambles order via `IN ()`.
- [x] 4.7 Return `{ items, total: items.length, page: 1, pageSize: items.length }` — pagination collapses when searching.

## 5. Studio approve workflow — index-search step

- [x] 5.1 In `apps/api/src/workflows/studio-approve.workflow.ts`, between the `upsert-tags` step and `trigger-video-processing`, add `currentStepName = "index-search"` then `await step.do("index-search", async () => { ... })`.
- [x] 5.2 Inside the step: `await indexPost(this.env, { id: postId, slug: created.slug, title: enriched.title, body: enriched.description, tags: enriched.tags.map(name => ({ slug: slugifyTag(name), name })).filter(t => t.slug), format: videoFileKey ? "mp4" : "jpg", access: "premium", publishedAt: scheduledAt ? new Date(scheduledAt) : null })`.
- [x] 5.3 Do NOT wrap the call in try/catch. If R2 fails, the workflow's outer try/catch already handles failure (notifies the agent and reverts the generation row).

## 6. Creator handler — write/delete hooks

- [x] 6.1 In `apps/api/src/handlers/creator.handler.ts` `POST /posts`: after `upsertPostTags`, run a SELECT to fetch the just-inserted row with joined tags, then call `indexPost(c.env, ...)`. The tag aggregate JSON parsing helper from `posts.handler.ts` can be lifted into `lib/search-index.ts` or duplicated — pick one.
- [x] 6.2 In `PATCH /posts/:id`: after the `db.update(posts)`, `db.delete(postTags)`, `upsertPostTags()` sequence, fetch the fresh joined row and call `indexPost`. The existing `updatedRow` SELECT already has all the data — wire it.
- [x] 6.3 In `DELETE /posts/:id`: before `db.delete(posts)`, capture the id (already in scope as `id`), and after the delete completes, call `await deindexPost(c.env, id)`.

## 7. Backfill / reindex endpoint

- [x] 7.1 In `apps/api/src/handlers/studio.handler.ts` (or a new `admin.handler.ts` if it fits cleaner), add `POST /search/reindex` protected by `authMiddleware + protect("content.manage")`. Implementation: query all `posts` with `status = 'published'`, joined with metadata + tags. For each row, call `indexPost(c.env, ...)`. Return `{ indexed: N }`.
- [x] 7.2 If using the studio handler: add `.route("/api/v1/studio", studioHandler)` chaining isn't disturbed — just append the route inside the existing handler builder.
- [x] 7.3 Wire the route through the contract if it's a new handler. Skip if added to studio handler (already wired).

## 8. Seeder hook (optional but recommended)

- [x] 8.1 ~~Create `packages/database/seeder/seeds/search-index.ts`~~ — DEFERRED. The seeder uses `better-sqlite3` (local) and `proxyDrizzle` over the Cloudflare REST API (remote); neither path has an R2 binding. Operator runs `POST /api/v1/studio/search/reindex` after `pnpm db:seed` instead — same effect, single source of indexing logic.
- [x] 8.2 ~~Wire `seedSearchIndex` into seeder index~~ — DEFERRED, same reason as 8.1.

## 9. Web server functions

- [x] 9.1 In `apps/web/src/routes/-fn/posts.ts`, change `postsQueryOptions` signature to `(page = 1, tag?: string, q?: string)`. Include `q` in the queryKey: `["posts", page, tag, q]`. Pass `q` to `getPostsFn` data, and to the `$get({ query })` call as `q: q` (only when truthy — match the existing `tag` conditional pattern).
- [x] 9.2 Create `apps/web/src/routes/-fn/search.ts` exporting `searchPostsFn` (calls the same `posts.$get({ query: { q } })`) and `searchPostsQueryOptions(q: string)` with `enabled: q.trim().length > 1` so empty/short input doesn't fire requests.

## 10. Feed page

- [x] 10.1 In `apps/web/src/routes/(app)/_home/feed/index.tsx`, change `useSuspenseQuery(postsQueryOptions(1, tag))` to `useSuspenseQuery(postsQueryOptions(1, tag, q))`. The cache now varies by query, so typing in the search input triggers a new server fetch.
- [x] 10.2 Remove the in-memory `q` filter (the `if (q) items = items.filter(...)` block in the `filtered` useMemo). Server returns ranked results.
- [x] 10.3 When `q` is set, suppress pagination — guard the pagination block with `!q && totalPages > 1`.
- [x] 10.4 Add a small "Searching for «query»" hint above the grid when `q` is set, with a clear button that calls `setSearch({ q: undefined })`.

## 11. Command palette (Cmd+K)

- [x] 11.1 Create a `useDebouncedValue<T>(value: T, delayMs: number): T` hook — minimal: `useEffect` with `setTimeout(setState, delay)`, cleanup with `clearTimeout`. Place in `apps/web/src/lib/hooks.ts` (create the file if it doesn't exist).
- [x] 11.2 In `apps/web/src/routes/(app)/_home/-components/search-dialog.tsx`: add a controlled input value via `useState`, debounce it (250ms), call `useQuery(searchPostsQueryOptions(debouncedQ))`.
- [x] 11.3 Pass `shouldFilter={false}` to the `CommandDialog`/`Command` root so cmdk doesn't re-filter or re-rank the server-ranked results.
- [x] 11.4 Render the search results as a `CommandGroup heading="Results"` with `CommandItem` rows — thumbnail (img src=`post.coverThumb`), title, first tag name as a muted suffix. `onSelect` calls `closeSearch()` then `navigate({ to: "/feed/$slug", params: { slug } })`.
- [x] 11.5 Render the existing tag list as a `CommandGroup heading="Browse by tag"`, but only when the debounced query is empty/short (`debouncedQ.length <= 1`).
- [x] 11.6 Update `CommandEmpty` text: when `debouncedQ.length > 1` show `No matches for "{q}".`, otherwise `Type to search, or pick a tag below.`.
- [x] 11.7 Add a loading indicator (`CommandLoading` from cmdk, or a custom `CommandItem` skeleton) when `isLoading && debouncedQ.length > 1`.

## 12. Verification

- [ ] 12.1 After `pnpm db:seed`, run `pnpm reindex` (or hit the reindex endpoint) — confirm 12 objects appear under R2 `search/posts/` prefix. Spot-check one with `wrangler r2 object get search/posts/<id>.md` — verify front matter is well-formed YAML and the body contains title + description + tag names.
- [ ] 12.2 Wait for AI Search to crawl (a few minutes; the Cloudflare dashboard shows indexing status). Hit `GET /api/v1/posts?q=moody+rain` directly — confirm `Noir Rain Loop` and `Obsidian Fog` rank in the top three.
- [ ] 12.3 Hit `GET /api/v1/posts?q=moody+rain&tag=loop` — confirm only loop-tagged posts come back, still ranked by relevance.
- [ ] 12.4 Open `/feed` in the browser, type "moody rain" into the search input → grid updates to ranked semantic results. Clear the input → grid restores to chronological browse.
- [ ] 12.5 Trigger Cmd+K → palette opens with tag list. Type "moody" → palette shows up to 8 ranked posts inline. Press Enter on the first → navigate to `/feed/$slug`. Verify the dialog closes on navigate.
- [ ] 12.6 Trigger a studio approve E2E in dev — confirm the new post's search document lands in R2 (`wrangler r2 object get search/posts/<newId>.md`).
- [ ] 12.7 Delete a post via the creator UI — confirm the corresponding R2 document is gone (`wrangler r2 object get` returns 404).
- [ ] 12.8 Temporarily break the AI Search binding (rename it in wrangler.jsonc, run `pnpm dev`) — confirm the feed still works via SQL `LIKE` fallback. Restore the binding.

## 13. Documentation

- [x] 13.1 Add a short paragraph to `CLAUDE.md` under a new "Search" subsection: explain that posts are indexed via R2 `search/posts/{postId}.md`, that the AI Search binding is `AI_SEARCH`, and that all write paths go through `indexPost` from `apps/api/src/services/search.service.ts`.
- [x] 13.2 Document the one-time dashboard setup (the steps in 0.1) in the project README's dev setup section, since it's not driven by Wrangler config.
