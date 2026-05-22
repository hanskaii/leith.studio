## Why

Feed search is still client-side string matching against title and tag name (`apps/web/src/routes/(app)/_home/feed/index.tsx`, lines 78–84). Symptoms:

- `"moody atmospheric"` returns zero results even though `"Noir Rain Loop"` is exactly that — substring match has no semantic understanding.
- The feed loads page 1 (12 items) and filters in memory. `?q=` does not trigger a new server call — it only filters what's already loaded. At thousands of posts, search becomes useless because the matching post is on page 47.
- No way to combine concepts ("dark transition", "warm glow") — only literal token overlap matches.

`normalize-tags` is now landed (tags have proper relations + AI generates tags per asset). With that structural groundwork in place, this change wires the feed into **Cloudflare AI Search** so search becomes semantic, server-side, and library-scale.

The Studio approve workflow already runs an AI enrichment step that produces `title`, `description`, and `tags[]`. Those three fields are exactly the rich text AI Search needs to embed. This change makes the workflow ALSO push a search document for the new post — and switches the feed to query AI Search when `?q=` is set.

## What Changes

### Cloudflare bindings

- **ADD** `ai_search` binding to `apps/api/wrangler.jsonc` — index name `leith-posts`, binding name `AI_SEARCH`.
- **ADD** `AI_SEARCH` to `CloudflareBindings` (web auto-regenerates via `wrangler types`).

### Search document layer

- **ADD** `apps/api/src/lib/search-document.ts` — exports `buildSearchDocument(post)` returning a Markdown string with YAML front matter (postId, slug, type, access, tags, publishedAt), and `searchDocumentKey(postId)` returning the R2 key `search/posts/{postId}.md`.
- **ADD** `apps/api/src/services/search.service.ts` — exports `indexPost(env, post)` (writes document to R2), `deindexPost(env, postId)` (removes document), and `searchPosts(env, { query, tag?, max })` returning ranked `{ postId, score }[]`. The R2 layer is the indexing backend; AI Search auto-crawls the `search/posts/*` prefix.

### API layer

- **MODIFY** `apps/api/src/handlers/posts.handler.ts` `GET /`:
    - When `q` is set: call `searchPosts({ query: q, tag, max: 50 })` → get ranked post IDs → `SELECT posts WHERE id IN (...)` joined with metadata + tag aggregate → re-sort the SELECT result by AI Search rank → return as items. Pagination collapses to top-50 (single page).
    - When `q` is absent: existing SQL path unchanged (browse + tag filter remain pure D1).
    - If `searchPosts` throws (binding misconfigured, AI Search down): fall back to SQL `LIKE` on title + tag name so the feature degrades to today's behavior instead of erroring.

### Studio approve workflow

- **MODIFY** `apps/api/src/workflows/studio-approve.workflow.ts`:
    - **ADD** step `index-search` after `upsert-tags` and before `trigger-video-processing` — calls `indexPost(this.env, createdPost)` with the freshly-created post, its title, description, and tag names. Re-running this step is idempotent (R2 PUT overwrites).

### Creator handler (admin direct CRUD)

- **MODIFY** `apps/api/src/handlers/creator.handler.ts`:
    - `POST /posts` — after `upsertPostTags`, call `indexPost(c.env, ...)` for the new post (only when status flips to `published`, or always for drafts? — default: index drafts too, so creator workflow can preview semantic matching).
    - `PATCH /posts/:id` — after the update transaction commits, call `indexPost(c.env, ...)` with the updated row.
    - `DELETE /posts/:id` — call `deindexPost(c.env, postId)` so the R2 document is removed (AI Search drops it on next crawl).

### Backfill script

- **ADD** `packages/database/seeder/seeds/search-index.ts` — iterates all `status='published'` posts, builds a search document for each, writes to R2. Runs as part of `pnpm db:seed` (after `seedPosts`). Allows one-shot rebuild of the index against the current DB state.
- **ADD** `pnpm reindex` script at `apps/api/package.json` — calls a `POST /api/v1/admin/search/reindex` endpoint that walks the published posts and re-runs `indexPost` for each. Protected by `content.manage`. Useful when the document schema changes.

### Frontend

- **MODIFY** `apps/web/src/routes/-fn/posts.ts` — `postsQueryOptions` and `getPostsFn` accept an optional `q` parameter, threaded through to the API as `?q=<query>`.
- **MODIFY** `apps/web/src/routes/(app)/_home/feed/index.tsx`:
    - Pass `q` into `postsQueryOptions(1, tag, q)` so a new query string triggers a new server fetch. Cache key includes `q`.
    - Remove the in-component `q` filter (`title.includes(q)` block). Server returns already-ranked results.
    - When `q` is set, hide pagination (search returns top-50 as single page).
    - Show a small "Searching for moody rain..." note above the grid when a search is active.
- **MODIFY** `apps/web/src/routes/(app)/_home/-components/search-dialog.tsx` — the global Cmd+K command palette becomes an actual semantic search surface, not just a tag browser:
    - As the user types (debounced ~250ms), call the new `searchPostsQueryOptions(q)` which hits `GET /api/v1/posts?q=<query>` and returns the top hits.
    - Render ranked posts inline as `CommandItem`s with the thumbnail, title, and first tag. Clicking navigates to `/feed/$slug` and closes the dialog.
    - Keep the "Browse by tag" section as a secondary group, shown only when the input is empty.
    - When the input has text but no results returned, show "No matches for …" inside `CommandEmpty`.
- **ADD** `apps/web/src/routes/-fn/search.ts` — `searchPostsFn` server function + `searchPostsQueryOptions(q)` with `enabled: q.length > 1` so the palette doesn't fire on every keystroke. Re-uses the existing `GET /api/v1/posts?q=` endpoint (no new route — the palette is just a different consumer of the same search path).

## Capabilities

### Modified Capabilities

- `content-library`: Search transitions from client-side `String.includes` to Cloudflare AI Search semantic ranking. The feed remains a single endpoint (`GET /api/v1/posts`) but branches internally — `q` parameter routes through AI Search, `tag`/`type` filters layer on top. Indexing happens automatically on post publish/update; no separate "index this post" UI is needed.
- `studio-agent`: The approve workflow gains an `index-search` step so newly-created posts are searchable as soon as the workflow finishes. Idempotent — workflow retries don't duplicate documents.

### New Capabilities

- `search-index`: An R2-backed search document layer (`search/posts/{postId}.md`) consumed by Cloudflare AI Search via auto-crawl. The application code never talks to the AI Search items API directly — R2 is the source of truth, AI Search is the index. This lets the same documents be re-crawled, replaced, or deleted by manipulating R2 alone.

### Unchanged Capabilities

- `asset-download`, `member-access`, `content-publishing` — unchanged.
- The `tag` filter — still a SQL constraint. AI Search returns candidate IDs; the tag filter prunes them. Tags are NOT re-implemented as a metadata filter on the AI Search side, because the SQL relation is already efficient and authoritative.

## Impact

- `apps/api/wrangler.jsonc` — new `ai_search` binding entry
- `apps/api/src/lib/search-document.ts` — new file
- `apps/api/src/services/search.service.ts` — new file
- `apps/api/src/handlers/posts.handler.ts` — branch on `q` in `GET /`
- `apps/api/src/handlers/creator.handler.ts` — `indexPost` on create/update, `deindexPost` on delete
- `apps/api/src/handlers/admin.handler.ts` (or extend existing studio handler) — new `POST /admin/search/reindex` route
- `apps/api/src/workflows/studio-approve.workflow.ts` — new `index-search` step
- `apps/api/src/types/hono.types.ts` — `AI_SEARCH` binding type
- `packages/database/seeder/seeds/search-index.ts` — new file (optional, only if seeder should also bootstrap the index)
- `apps/web/src/routes/-fn/posts.ts` — accept `q` parameter
- `apps/web/src/routes/-fn/search.ts` — new file: debounced query for the command palette
- `apps/web/src/routes/(app)/_home/feed/index.tsx` — pass `q` through, drop in-memory text filter
- `apps/web/src/routes/(app)/_home/-components/search-dialog.tsx` — palette becomes semantic search, tags become secondary
- Cloudflare dashboard: create the AI Search instance pointing at the R2 bucket with prefix `search/posts/` (one-time setup, documented in tasks)

## Out of Scope

- **Reranking, autocomplete, "did you mean" suggestions** — AI Search supports these but they're separate UI work and a separate change.
- **Search analytics** — no tracking of query terms or click-through is added in this change.
- **Multi-language support** — index documents are English only; localization is a future concern.
- **Embedding posts other than published assets** — drafts get indexed (so creator preview works), but private/archived content is not in scope.
- **Replacing the tag filter with AI Search metadata filters** — covered in design.md rationale.
