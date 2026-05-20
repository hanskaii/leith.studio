## Context

The app has a fully functional posts API (`GET /api/v1/posts`, `GET /api/v1/posts/:slug`, `GET /api/v1/posts/:slug/download`) backed by a Drizzle/D1 database seeded with 12 cinematic assets. However the frontend (`_home/` landing and `/feed` route) still renders hardcoded static arrays (`ASSETS`, `FEED_ASSETS`) instead of calling the API. Additionally the download endpoint throws `404` in local dev because R2 has no actual files, making end-to-end testing impossible without deploying real objects.

Key constraints:
- All server functions must live in `apps/web/src/routes/-fn/` grouped by domain (existing `posts.ts` already has `postsQueryOptions` + `getPostsFn`)
- Data-fetching components must use `useSuspenseQuery`; pages must wrap data sections in `<Suspense>` with skeleton fallbacks, not `pendingComponent`
- The API handler uses method-chaining (required for RPC inference); any modification must preserve chain
- Downloads stream directly from R2 — no signed URL pattern in play

## Goals / Non-Goals

**Goals:**
- Make the download endpoint return a usable dummy response in dev (no R2 object needed)
- Replace `AssetGrid`'s static array with a live `useSuspenseQuery` call
- Replace `FeedPage`'s static `FEED_ASSETS` with a live `useSuspenseQuery` call
- Keep the static `FAQ_ITEMS`, `STEPS`, motion variants in `home-data.ts` (only `ASSETS` export is removed)

**Non-Goals:**
- Infinite scroll / `useSuspenseInfiniteQuery` — standard paginated query is sufficient for now
- Uploading real assets to R2
- Changing the seeder data (12 posts + stats already exist)
- Modifying the posts API shape

## Decisions

### 1. Dev fallback: redirect vs. inline dummy body

**Chosen**: Return a `302 Location` redirect to a public placeholder URL (Unsplash for jpg/png, a public sample MP4 CDN URL for mp4/webm).

**Rationale**: Streaming a real R2 body is the production path; in dev we just need something downloadable to verify the UI. A redirect is zero-allocation and doesn't require bundling binary content. Gated by `c.env.ASSETS_DEV_FALLBACK` — when the binding is set to `"true"` and R2 returns `null`, redirect instead of throwing.

**Alternative considered**: Return a fake `200` with a tiny buffer — rejected because `Content-Disposition: attachment` with a fake MIME body would confuse browsers and break format detection.

### 2. Home asset grid: full page query vs. featured slice

**Chosen**: Reuse `postsQueryOptions(1)` (page 1, up to 12 items) — the grid shows all seeded assets with no further pagination.

**Rationale**: The landing page grid is intentionally a curated preview of the full library; querying page 1 with `pageSize=12` (the API default) surfaces exactly the seeded content. No new server function or query key needed.

### 3. Feed page: keep client-side filter/sort or move to server

**Chosen**: Keep client-side filter/sort (tag, type, search, sort) applied to the full fetched page, matching current UX — only the data source changes from static to API.

**Rationale**: The dataset is small (12 items per page). Moving filter logic server-side would require new query params in the handler and a new `zValidator` schema. That scope belongs to a separate change. Current filter/sort functions in `FeedPage` continue to work if we map the API response to `FeedAsset` shape.

### 4. Type adapter: API response → `FeedAsset`

The API returns `{ id, slug, title, coverThumb, tags, format, resolution, access, isLoop, downloadCount, publishedAt, fileUrl }`. `FeedAsset` has `tag` (singular), `type` (`"video"|"image"`), `popularity`. We add a small `toFeedAsset()` mapper in the server function or inline in the component.

Mapping:
- `tags[0]` → `tag`
- `format` ∈ `{mp4, webm}` → `type: "video"`, `{jpg, png}` → `type: "image"`
- `downloadCount` → `popularity`

## Risks / Trade-offs

- **Fallback env binding absent in prod** → `ASSETS_DEV_FALLBACK` is not set in prod `wrangler.toml`, so the redirect branch is dead code in production — intentional and safe.
- **Static removal breaks other consumers** → `ASSETS` from `home-data.ts` is only imported by `asset-grid.tsx`; removing it is safe after the grid is rewired.
- **Feed hydration flash** → `<Suspense>` skeleton covers the grid only; the search/filter controls render immediately from URL state, which is correct.

## Migration Plan

1. Add `ASSETS_DEV_FALLBACK` binding to `wrangler.toml` (dev only) — no migration needed in D1
2. Update `posts.handler.ts` download branch — deploy to dev Worker; verify redirect works
3. Update `asset-grid.tsx` — Suspense + live query
4. Update `feed/index.tsx` — replace FEED_ASSETS with live query + mapper
5. Remove `ASSETS` export from `home-data.ts`
6. Run seeder (`pnpm db:seed`) to ensure D1 has fresh data; test full download flow
