## Why

The feed and home landing page currently render static hardcoded arrays (`FEED_ASSETS`, `ASSETS`) that are disconnected from the database, making the UI stale and preventing real download tracking. The seeder already seeds 12 posts with metadata and download stats, but the download endpoint throws 404 when R2 files are absent (dev), and the frontend never queries the live API.

## What Changes

- Add a dummy-file fallback to the `/:slug/download` endpoint so downloads work in dev without real R2 objects (redirects to a placeholder URL per format)
- Replace the static `FEED_ASSETS` array in `_home/feed/` with a live `useSuspenseQuery` backed by the existing `postsQueryOptions` server function
- Replace the static `ASSETS` array in the `AssetGrid` component on the home landing page with a live `useSuspenseQuery` backed by `postsQueryOptions`
- Add `<Suspense>` wrappers with skeleton fallbacks so static page shell (header, nav) renders immediately

## Capabilities

### New Capabilities

- `dummy-download-fallback`: Dev-mode fallback in the download endpoint that returns a redirect to a public placeholder asset (Unsplash for images, sample MP4 for video/webm) when the R2 object key is not found, gated by `ASSETS_DEV_FALLBACK=true` env binding.
- `home-live-feed`: `AssetGrid` on the landing page fetches from the real posts API via `postsQueryOptions` and renders with `useSuspenseQuery` + `<Suspense>` skeleton.
- `feed-live-query`: The `/feed` route replaces static `FEED_ASSETS` with a real paginated API query using `useSuspenseInfiniteQuery` (or `useSuspenseQuery` per page) backed by `postsQueryOptions`.

### Modified Capabilities

- none

## Impact

- `apps/api/src/handlers/posts.handler.ts` — download route gains a dev fallback branch
- `apps/web/src/routes/(app)/_home/-components/asset-grid.tsx` — switches from static array to live query
- `apps/web/src/routes/(app)/_home/feed/index.tsx` — switches from static array to live query
- `apps/web/src/routes/(app)/_home/-lib/home-data.ts` — `ASSETS` export removed (static data no longer needed by grid)
- `apps/web/src/routes/-fn/posts.ts` — no new functions needed (existing `postsQueryOptions` + `getPostsFn` are sufficient)
