## Why

Leith is a member-only platform for downloadable visual assets (looping video backgrounds, images) aimed at streamers, creators, and designers. The existing boilerplate ships with a three-tier SaaS pricing model (Starter/Pro/Credits) and post-only content — neither fits a one-time-purchase asset download product. This change replaces that model with a single All Access pass and extends posts to carry downloadable files.

## What Changes

- **BREAKING** `config/app.ts`: remove Starter, Pro, and Credits plans; replace with a single `all-access` one-time plan
- Extend the `posts` table with asset fields: `format`, `resolution`, `duration`, `isLoop`, `fileKey`, `fileSize`, `access`
- Add `GET /api/v1/posts/:slug/download` endpoint — auth-gated, proxies R2 file through API Worker via `STORAGE` binding; never exposes R2 keys to the client
- Add `asset.download` Gate action with two tiers: `free` (any logged-in user) and `premium` (member/admin only)
- Add `downloadCount` increment on every successful download
- Extend creator dashboard upload flow to accept and store the asset file alongside the cover image
- Update feed and post detail pages to show asset specs (format, resolution, duration) and a Download button
- Rebrand platform to **Leith** throughout (name, copy, `appConfig.name`)

## Capabilities

### New Capabilities

- `asset-download`: Secure file download via API proxy — auth check, Gate tier check, R2 stream, download count tracking
- `asset-catalog`: Extended post entity with asset metadata fields; feed and detail views show specs and download affordance
- `config-cleanup`: Single All Access one-time plan replaces the multi-tier SaaS config

### Modified Capabilities

- `content-library`: Post entity gains asset fields (`format`, `resolution`, `duration`, `isLoop`, `fileKey`, `fileSize`, `access`); feed cards show format/resolution badges
- `content-publishing`: Creator upload flow extended to accept the asset file (`fileKey`); asset metadata fields editable in the post editor
- `member-access`: Gate action `asset.download` added alongside `content.read`; `free`-tier download allowed for any authenticated user, `premium`-tier requires member/admin role

## Impact

- `packages/database/schema/posts.ts` — new columns, new migration required
- `config/app.ts` — payments array replaced
- `config/permissions.ts` — `asset:download:free` added to `user` role; `asset:download:premium` added to `member`/`admin`
- `config/policies/` — new `AssetPolicy` with `download` action using `combine()`
- `apps/api/src/handlers/posts.handler.ts` — new `GET /:slug/download` route
- `apps/api/src/handlers/creator.handler.ts` — extended `POST /upload` and `POST /posts`, `PATCH /posts/:id` for asset fields
- `apps/web/src/routes/(app)/_app/feed/` — PostCard shows asset badges; detail page shows specs + Download button
- `apps/web/src/routes/(app)/_app/creator/$id.tsx` — asset fields in editor form
- `apps/web/src/routes/-fn/posts.ts` — new `downloadAssetFn`
