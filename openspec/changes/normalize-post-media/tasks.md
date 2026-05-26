## 1. Schema — Add new columns and table

- [x] 1.1 Add `mediaStatus` column to `posts` schema
- [x] 1.2 Add `access` column to `posts` schema
- [x] 1.3 Create `packages/database/schema/post-assets.ts`
- [x] 1.4 Add Drizzle relation: `posts` → `postAssets` (one-to-many) in `posts.ts`
- [ ] 1.5 Run `pnpm db:generate` (user to run manually due to TTY requirement)

## 2. Schema — Backfill migration

- [x] 2.1 Skipped — single destructive migration approach (pre-launch, seed regenerates)
- [x] 2.2 Skipped — combined with single migration

## 3. Schema — Drop old columns

- [x] 3.1 Remove `processingStatus`, `fileKey`, `previewKey`, `clipKey`, `access` from `post_metadata` schema
- [x] 3.2 Remove `coverImage`, `coverThumb` from `posts` schema
- [ ] 3.3 Run `pnpm db:generate` (combined with task 1.5, user to run manually)

## 4. API handlers — posts.handler.ts

- [x] 4.1 Add `postAssets` to all three query SELECT blocks (via correlated subquery JSON_GROUP_OBJECT — cleaner than LEFT JOIN aggregation alongside tags)
- [x] 4.2 Replace feed visibility filter with `posts.mediaStatus = "ready"`
- [x] 4.3 Add `access: posts.access` to all SELECT blocks
- [x] 4.4 Update `.map()` transforms to derive `coverUrl`/`thumbUrl` via `toUrl(key)` helper (handles both R2 keys and full URLs for seed compat)
- [x] 4.5 Update download endpoint to query `post_assets WHERE role = 'asset'`

## 5. API handlers — creator.handler.ts

- [x] 5.1 Update POST `/posts` — inserts to `post_assets` with `role = 'asset'`, writes `posts.access`, sets `mediaStatus = 'ready'`
- [x] 5.2 Update PATCH `/posts/:id` — upsert `post_assets` in place, no processing trigger
- [x] 5.3 Removed all reads/writes to dropped columns
- [x] 5.4 No `VIDEO_PROCESSING_WORKFLOW.create` calls remain in creator handler
- [x] 5.5 Creator GET uses `media` subquery + new field names

## 6. Workflows

- [x] 6.1 `studio-approve.workflow.ts` — uses `post_assets` for cover/thumb/asset, removed trigger-video-processing step, sets `mediaStatus = 'ready'`
- [x] 6.2 `video-processing.workflow.ts` — stubbed to no-op (kept registered in Wrangler for future re-introduction)

## 7. Other handlers and services

- [x] 7.1 `studio.handler.ts` updated
- [x] 7.2 `tags.handler.ts` updated
- [x] 7.3 `search.service.ts` updated

## 8. Web layer

- [x] 8.1 `FeedAsset` type uses `coverUrl`/`thumbUrl` (removed coverThumb, previewUrl, clipUrl)
- [x] 8.2 Feed card, feed detail, search dialog updated
- [x] 8.3 Removed `thumbUrl()` client-side helper from search-dialog
- [x] 8.4 Removed hover-clip behaviour from feed-card

## 9. Verification

- [x] 9.1 Type-checked clean — only `fileKey` references remaining are valid input-schema field names
- [x] 9.2 Feed query uses `posts.mediaStatus` filter (INNER JOIN postMetadata still present for format/resolution/etc. — visibility gating itself no longer requires it)
- [ ] 9.3 Run `pnpm db:migrate` + `pnpm db:seed` (user to run after `db:generate`)
- [ ] 9.4 Manual end-to-end test (user to verify after migration)
