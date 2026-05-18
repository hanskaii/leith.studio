## 1. Config & Branding

- [x] 1.1 Update `config/app.ts`: set `name: "Leith"`, replace all three payment plans with a single `all-access` plan (`type: "standard"`, `interval: "one-time"`, product-appropriate features list)
- [x] 1.2 Update `apps/api/.dev.vars.example` and `apps/web/.env.example`: rename any `FUNNNIT_*` vars to `LEITH_*` if present; verify `DODO_LICENSE_PRODUCT_ID` and `VITE_DODO_CHECKOUT_URL` are documented

## 2. Permissions & Gate

- [x] 2.1 Add `"asset:download:free"` to `user` role in `config/permissions.ts`
- [x] 2.2 Add `"asset:download:free"` and `"asset:download:premium"` to `member` and `admin` roles in `config/permissions.ts`
- [x] 2.3 Create `config/policies/asset.ts` with `AssetPolicy.download`: `combine(authorize("asset:download:free"), (ctx) => ctx.resource.access === "free" ? allow() : authorize("asset:download:premium")(ctx))`
- [x] 2.4 Add `InferPolicyActions<typeof AssetPolicy>` to `GateActions` interface in `config/index.ts`
- [x] 2.5 Register `asset: AssetPolicy` in `Gate.policies({...})` in `config/index.ts`

## 3. Database Schema

- [x] 3.1 Create `packages/database/schema/post-metadata.ts` with `postMetadata` table: `postId` (text PK + FK → posts.id), `format` (text notNull), `resolution` (text notNull), `duration` (integer nullable), `isLoop` (integer notNull default 0), `fileKey` (text notNull), `fileSize` (integer notNull), `access` (text notNull default `"premium"`); export from `packages/database/schema/index.ts`
- [x] 3.2 Create `packages/database/schema/post-stats.ts` with `postStats` table: `id` (cuid PK), `postId` (text notNull FK → posts.id), `userId` (text notNull FK → users.id), `downloadedAt` (integer timestamp notNull); add index on `postId`; export from `packages/database/schema/index.ts`
- [x] 3.3 Add Drizzle relations in `packages/database/schema/posts.ts`: `posts` → `postMetadata` (one-to-one), `posts` → `postStats` (one-to-many), `users` → `postStats` (one-to-many)
- [x] 3.4 Run `pnpm db:generate` to generate the migration SQL
- [x] 3.5 Run `pnpm db:migrate` (local) — requires `wrangler dev` running first to create `.wrangler` state directory

## 4. API — Asset Download Endpoint

- [x] 4.1 Add `GET /download` route to `apps/api/src/handlers/posts.handler.ts` under `/:slug` — `authMiddleware` + gate check (`Gate.assert("asset.download", { actor: user, resource: { access: post.access } })`) + `STORAGE.get(post.fileKey)` stream + fire-and-forget `db.insert(postStats)` event row
- [x] 4.2 Return 404 if post has no `fileKey`; set `Content-Disposition: attachment; filename="<slug>.<format>"` and correct `Content-Type` on success
- [x] 4.3 Register the updated posts handler in `apps/api/src/contract.ts` (no new route prefix needed — same `/api/v1/posts`)

## 5. API — Creator Handler Updates

- [x] 5.1 Extend `POST /posts` and `PATCH /posts/:id` in `apps/api/src/handlers/creator.handler.ts` to accept `format`, `resolution`, `duration`, `isLoop`, `fileKey`, `fileSize`, `access` — when any present, upsert a `post_metadata` row keyed by `postId`
- [x] 5.2 Add `POST /upload-asset` route to the creator handler: same auth + protect as cover upload, but accepts files up to 200MB (MP4/PNG/JPG/WebP), stores in R2 under key `posts/assets/<uuid>/<filename>`, returns `{ url, key }`
- [x] 5.3 Ensure `fileKey` is excluded from all public API responses in `posts.handler.ts`; INNER JOIN `post_metadata` when fetching posts; include `downloadCount` via subquery `SELECT COUNT(*) FROM post_stats WHERE postId = posts.id`

## 6. Web — Server Functions

- [x] 6.1 Add `downloadAssetFn` to `apps/web/src/routes/-fn/posts.ts`: `createServerFn({ method: "GET" }).inputValidator((input: { data: string }) => input).handler(({ data: { data: slug } }) => fetchApiWithAuth(\`/api/v1/posts/${slug}/download\`))`— returns raw`Response`
- [x] 6.2 Add `uploadAssetFn` to `apps/web/src/routes/-fn/creator.ts`: calls `POST /api/v1/creator/upload-asset` with `FormData`, returns `{ url, key }`

## 7. Web — Feed & Post Detail Updates

- [x] 7.1 Update `PostCard` in `apps/web/src/routes/(app)/_app/feed/-components/post-card.tsx` to show format and resolution badges when `format` is not null (terracotta pill style matching existing tag badges)
- [x] 7.2 Update `apps/web/src/routes/(app)/_app/feed/$slug.tsx`: add asset spec table (Format, Resolution, Duration, Loop, File size, Access) when `fileKey` presence is indicated by `format` being set
- [x] 7.3 Add Download button to post detail page: active for eligible users, replaced by "Get All Access" CTA for `user`-role on premium assets, hidden if post has no downloadable file (`format === null`)
- [x] 7.4 Wire Download button to `downloadAssetFn(slug)` — use `useMutation` to handle pending state; on success trigger browser file save via `URL.createObjectURL` + programmatic anchor click

## 8. Web — Creator Editor Updates

- [x] 8.1 Add asset metadata fields to the creator post editor (`apps/web/src/routes/(app)/_app/creator/$id.tsx`): `format` select, `resolution` text, `duration` number (nullable), `isLoop` toggle, `access` toggle (`"free"` / `"premium"`); disable Publish button when `fileKey` is absent with inline message "Upload an asset file before publishing"
- [x] 8.2 Add asset file upload zone to the editor: separate from cover image upload, calls `uploadAssetFn`, stores returned `key` in form field `fileKey`, shows filename + filesize after upload
- [x] 8.3 Wire `fileKey`, `fileSize`, `format`, `resolution`, `duration`, `isLoop`, `access` into `createPostFn` and `updatePostFn` payloads in the editor's `onSubmit`

## 9. Polish & Verification

- [x] 9.1 Verify `fileKey` does not appear in any API response consumed by the web layer (grep `fileKey` in network responses during manual test)
- [x] 9.2 Verify `downloadCount` in API responses is derived from `post_stats` COUNT, not a column value
- [x] 9.3 Run `pnpm test` — fix any failing tests; write unit tests for `AssetPolicy.download` covering all four role × access combinations
- [x] 9.4 Verify responsive layout of asset spec table and Download button on mobile (< 768px)
