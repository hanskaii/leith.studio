## 1. API — Dev Download Fallback

- [x] 1.1 In `apps/api/src/handlers/posts.handler.ts`, update the `/:slug/download` handler: after `STORAGE.get(row.fileKey)` returns `null`, check `c.env.ASSETS_DEV_FALLBACK === "true"` and return a `302` redirect to a public placeholder URL (`https://images.unsplash.com/...` for jpg/png, `https://www.w3schools.com/html/mov_bbb.mp4` for mp4/webm); otherwise keep the existing `ApiError.notFound` throw
- [x] 1.2 Add `ASSETS_DEV_FALLBACK = "true"` under `[vars]` in `apps/api/wrangler.toml` (dev only, no production secret needed) — using existing `APP_ENV` binding instead

## 2. Type Mapper — API Response → FeedAsset

- [x] 2.1 In `apps/web/src/routes/-fn/posts.ts`, export a `toFeedAsset()` helper that maps the API post item `{ id, slug, title, coverThumb, tags, format, resolution, access, isLoop, downloadCount, publishedAt }` to `FeedAsset` shape: `tags[0]` → `tag`, `format ∈ {mp4,webm}` → `type:"video"` / `{jpg,png}` → `type:"image"`, `downloadCount` → `popularity`, `access === "free" ? "free" : "members"` → `access`

## 3. Home Landing — AssetGrid Live Query

- [x] 3.1 In `apps/web/src/routes/(app)/_home/-components/asset-grid.tsx`, import `useSuspenseQuery` from `@tanstack/react-query` and `postsQueryOptions` from `@/routes/-fn/posts`
- [x] 3.2 Extract data-dependent rendering into a child component `AssetGridItems` that calls `useSuspenseQuery(postsQueryOptions(1))` and maps items via `toFeedAsset()` before passing to `FeedCard`
- [x] 3.3 In `AssetGrid`, wrap `<AssetGridItems>` in `<Suspense fallback={<AssetGridSkeleton />}>` where `AssetGridSkeleton` renders 8 gray rounded placeholder divs matching card aspect ratio
- [x] 3.4 Remove the `ASSETS` import from `asset-grid.tsx`
- [x] 3.5 Remove the `ASSETS` export (and its data) from `apps/web/src/routes/(app)/_home/-lib/home-data.ts`; keep `FAQ_ITEMS`, `STEPS`, `ACCESS_URL`, motion variants

## 4. Feed Page — Live Query

- [x] 4.1 In `apps/web/src/routes/(app)/_home/feed/index.tsx`, import `useSuspenseQuery` and `postsQueryOptions` and `toFeedAsset` from `@/routes/-fn/posts`
- [x] 4.2 Extract the grid section into a `FeedItems` sub-component that calls `useSuspenseQuery(postsQueryOptions(page))` and maps `items` via `toFeedAsset()`; apply existing client-side filter/sort logic to the mapped items
- [x] 4.3 Wrap `<FeedItems>` in `<Suspense fallback={<FeedGridSkeleton />}>`  where skeleton renders 6 gray placeholder cards
- [x] 4.4 Remove the `FEED_ASSETS` import from `feed/index.tsx`; the `FEED_TAGS` constant can remain in `feed-data.ts` or be inlined — derived from live data inside FeedItems instead

## 5. Verification

- [ ] 5.1 Run `pnpm db:seed` to ensure D1 has the 12 posts seeded with metadata and stats
- [ ] 5.2 Start the dev stack (`pnpm dev`) and verify the landing page asset grid renders real post thumbnails
- [ ] 5.3 Navigate to `/feed` and verify real posts render; confirm type/tag filters and sort work
- [ ] 5.4 Click download on a free asset while logged in and confirm a browser download is triggered (redirect to placeholder in dev)

## Notes
- `authDefaultRedirect` changed from `/feed` to `/` (feed requires `type`+`sort` search params)
- Pre-existing link TS errors to `/feed` fixed (hero, footer, steps, slug, creator, activate)
