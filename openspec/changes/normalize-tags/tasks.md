## 0. Database Schema

- [x] 0.1 Create `packages/database/schema/tags.ts` exporting `tags` table (`id` text PK, `slug` text notNull unique, `name` text notNull, `createdAt` timestamp notNull, index on `slug`), `postTags` table (`postId` text notNull FK→posts.id ON DELETE CASCADE, `tagId` text notNull FK→tags.id ON DELETE CASCADE, composite PK on `(postId, tagId)`, indexes on `tagId` and `postId`), `tagsRelations`, and `postTagsRelations`.
- [x] 0.2 Modify `packages/database/schema/posts.ts`: remove the `tags: text("tags", { mode: "json" })` column; add `postTags: many(postTags)` to `postsRelations`; import `postTags` from `./tags`.
- [x] 0.3 Modify `packages/database/schema/index.ts`: add `export * from "./tags"`.
- [x] 0.4 Add a `slugifyTag(name)` utility in `packages/database/utils/slug.ts` (or wherever the codebase keeps shared helpers — check `apps/api/src/lib/slug.ts` for prior art). Same lowercase + strip-punctuation + hyphenate logic as `uniqueSlug` but without DB collision retry.
- [ ] 0.5 ⚠️ NEEDS INTERACTIVE TTY: Run `pnpm db:generate` — drizzle-kit will produce SQL creating `tags` + `post_tags` and dropping `posts.tags`. Confirm prompts.
- [ ] 0.6 ⚠️ NEEDS INTERACTIVE TTY: Run `pnpm db:migrate:local` to apply.

## 1. Seeder

- [x] 1.1 Modify `packages/database/seeder/seeds/posts.ts`: extract the unique set of tag names from the 12 `postsData` entries. After inserting `posts`, insert each unique tag into `tags` (with `id = crypto.randomUUID()`, `slug = slugifyTag(name)`, `createdAt = now`). Then for each post, insert `post_tags` rows linking it to its tags' ids.
- [x] 1.2 Remove the `tags: [...]` array property from each entry in `postsData` (no longer a column on `posts`).
- [ ] 1.3 ⚠️ NEEDS INTERACTIVE TTY: Run `pnpm db:seed` and verify `SELECT * FROM tags` and `SELECT * FROM post_tags LIMIT 20` return expected rows.

## 2. Tags API

- [x] 2.1 Create `apps/api/src/handlers/tags.handler.ts` exporting `tagsHandler = new Hono<HonoEnv>()` with `GET /` returning `{ slug, name, postCount }[]`. SQL: INNER JOIN `post_tags`, `posts` (where `status = 'published'`), `post_metadata` (where `processingStatus = 'ready'`), GROUP BY `tags.id`, ORDER BY `postCount DESC, name ASC`. Wrap in `ApiResponse.ok`.
- [x] 2.2 Modify `apps/api/src/contract.ts`: `.route("/api/v1/tags", tagsHandler)`.
- [x] 2.3 Modify `apps/api/src/index.ts` (the main app, not contract): wire the same route. — auto-satisfied: index.ts already mounts the full `contract` via `app.route("/", contract)`, so no separate edit needed.

## 3. Posts API — Tag Joins

- [x] 3.1 In `apps/api/src/handlers/posts.handler.ts` `GET /`, replace the current query with a JOIN that includes `LEFT JOIN post_tags ON post_tags.post_id = posts.id LEFT JOIN tags ON tags.id = post_tags.tag_id` and aggregates with `sql<string>\`COALESCE(JSON_GROUP_ARRAY(JSON_OBJECT('slug', \${tags.slug}, 'name', \${tags.name})) FILTER (WHERE \${tags.id} IS NOT NULL), '[]')\``aliased to`tags`. Add `GROUP BY posts.id`. Parse the `tags`string with`JSON.parse` before returning.
- [x] 3.2 Replace the in-JS filter (`raw = tag ? items.filter(...) : items`) with a `WHERE posts.id IN (SELECT post_id FROM post_tags INNER JOIN tags ON tags.id = post_tags.tag_id WHERE tags.slug = ?)` subquery, applied only when `tag` query param is set. Remove the post-fetch `.filter()`.
- [x] 3.3 Update the same query shape for the total-count query so pagination reflects the tag filter.
- [x] 3.4 In `GET /:slug`, add the same tag JOIN + aggregate, returning `tags: { slug, name }[]` in the post payload. Single-row query, no GROUP BY needed if using a subselect.
- [x] 3.5 Update `apps/api/src/handlers/posts.handler.ts` `GET /:slug/download` — no tag changes needed (download doesn't read tags), but verify the SELECT still compiles after `posts.tags` column is dropped.

## 4. Studio Approve Workflow

- [x] 4.1 Modify `apps/api/src/workflows/studio-approve.workflow.ts`: import `slugifyTag` from `@workspace/database` (or wherever it lives), import `tags`, `postTags` schemas.
- [x] 4.2 Add a new `step.do("ai-enrich", ...)` between `upload-thumbnail` and `create-post`. If `thumbnailKey` is null, return `{ title: row.topic, description: row.videoPrompt || row.imagePrompt || row.topic, tags: [] }` without an AI call. Otherwise: fetch the object from `this.env.STORAGE.get(thumbnailKey)`, convert to base64, call `this.env.AI.run("@cf/meta/llama-3.2-11b-vision-instruct", { messages: [...] })` with a system prompt instructing JSON-only output with `title`/`description`/`tags`. Regex-extract the first `{...}` from the response, `JSON.parse` defensively, fall back to topic-based values on parse failure.
- [x] 4.3 Modify the `create-post` step: set `title = enriched.title` and `body = enriched.description`. Remove `tags: []` from the `posts` insert values (the column no longer exists after task 0.2).
- [x] 4.4 Add a new `step.do("upsert-tags", ...)` between `create-post` and `trigger-video-processing`. If `enriched.tags.length === 0`, return early. For each tag name: compute `slug = slugifyTag(name)`, skip empty slugs, `INSERT INTO tags VALUES (uuid, slug, name, now) ON CONFLICT (slug) DO NOTHING`, then `SELECT id FROM tags WHERE slug = ?` to get the canonical id, then `INSERT INTO post_tags VALUES (created.postId, tagId) ON CONFLICT DO NOTHING`. Wrap the loop in `db.transaction`.
- [x] 4.5 Update `currentStepName` tracking in the workflow's outer try/catch to include `"ai-enrich"` and `"upsert-tags"` for error notification accuracy.

## 5. Web — Server Functions & Types

- [x] 5.1 Create `apps/web/src/routes/-fn/tags.ts` with `getTagsFn` (server function calling `api.api.v1.tags.$get()`) and `tagsQueryOptions` (`queryKey: ["tags"]`, `queryFn: () => getTagsFn()`). Use `InferResponseType` from `hono/client`.
- [x] 5.2 Modify `apps/web/src/routes/-fn/posts.ts` `toFeedAsset`: change the parameter type — replace `tags: string[]` with `tags: { slug: string; name: string }[]`. Return `tags: item.tags` directly (no more `tags[0] ?? ""` collapse).
- [x] 5.3 Modify `apps/web/src/routes/(app)/_home/feed/-lib/feed-data.ts` `FeedAsset` type: replace `tag: string` with `tags: { slug: string; name: string }[]`. Delete the `FEED_ASSETS` and `FEED_TAGS` mock arrays — they're no longer used (the feed page is fully on live data).

## 6. Web — Feed Index

- [x] 6.1 In `apps/web/src/routes/(app)/_home/feed/index.tsx`, remove the in-component derivation `const tags = useMemo(() => [...new Set(...)], [allAssets])`. Replace with `const { data: tagList } = useSuspenseQuery(tagsQueryOptions())`.
- [x] 6.2 Render tag pills from `tagList`: each pill's key/value is the tag's `slug`; its label is the tag's `name`. The "active" state compares `tag === t.slug`.
- [x] 6.3 Remove the in-memory `tag` filter from the `filtered` useMemo: `if (tag) items = items.filter(a => a.tag === tag)` is deleted. The server now returns only matching posts when `?tag=` is set.
- [x] 6.4 Change `postsQueryOptions(1)` to pass `tag` through: `postsQueryOptions(1, tag)` so the cache keys vary by tag. (The function signature already accepts tag — see `apps/web/src/routes/-fn/posts.ts` line 51.)
- [x] 6.5 Update the empty-state text from `tagged ${tag}` to `tagged ${tagList.find(t => t.slug === tag)?.name ?? tag}` so users see the display name, not the slug.

## 7. Web — Asset Detail

- [x] 7.1 In `apps/web/src/routes/(app)/_home/feed/$slug.tsx`, change the `tag` derivation from `Array.isArray(post.tags) ? (post.tags[0] ?? "") : ""` to `const primaryTag = post.tags[0]; const tagName = primaryTag?.name ?? ""; const tagSlug = primaryTag?.slug`.
- [x] 7.2 Update the breadcrumb display (currently `<span>{tag}</span>`) to use `{tagName}`.
- [x] 7.3 Update the tag chip (currently `<span>...{tag}</span>`) to use `{tagName}`.
- [x] 7.4 Update `RelatedPosts` props: pass `tagSlug` instead of raw string. Inside, change the filter from `p.tags.includes(tag)` to `p.tags.some(t => t.slug === tagSlug)`.
- [x] 7.5 Update the "More like this" heading from `{tag} assets` to `{tagName} assets`.

## 8. Web — Feed Card

- [x] 8.1 In `apps/web/src/routes/(app)/_home/feed/-components/feed-card.tsx`, audit any references to `asset.tag` (currently no direct references — verify and skip if clean).

## 9. Type Verification

- [x] 9.1 Run `pnpm typecheck` from repo root. Resolve any breakages — most will be the old `string[]` → `{slug, name}[]` shape mismatch in code that still reads `post.tags[0]` as a string.
- [x] 9.2 Search for other readers of the old shape: `grep -rn "post.tags\|posts.tags\|\.tags\[0\]" apps/web/src apps/api/src` and update each.

## 10. Manual Verification

- [ ] 10.1 After `pnpm db:seed`, hit `GET /api/v1/tags` → confirm it returns the seeded tags with non-zero post counts.
- [ ] 10.2 Hit `GET /api/v1/posts` → confirm `tags` field is `{ slug, name }[]` per post.
- [ ] 10.3 Hit `GET /api/v1/posts?tag=loop` → confirm only posts with the "loop" tag come back, with correct `total` for pagination.
- [ ] 10.4 In the web app, open `/feed` → confirm tag pills render with display names; click a pill → URL gains `?tag=<slug>` and grid filters correctly.
- [ ] 10.5 Open a post detail page → confirm breadcrumb + tag chip show the tag name, and "More like this" lists posts that share the primary tag.
- [ ] 10.6 Trigger a studio approve flow end-to-end in dev: approve a generation → confirm the new post has AI-generated title, description (body), and tags linked via `post_tags`.

## 11. Documentation

- [x] 11.1 Update `CLAUDE.md` if any of the database rules need to mention tags as a separate concern — reviewed: CLAUDE.md doesn't enumerate tables, no change needed.
