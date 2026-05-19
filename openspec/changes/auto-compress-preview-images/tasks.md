## 1. Dependency & Setup

- [x] 1.1 Add `@cf-wasm/photon` to `apps/api` dependencies (`pnpm add @cf-wasm/photon --filter apps/api`)
- [x] 1.2 Verify Worker bundle size remains under 10MB after adding the WASM package

## 2. Database Schema

- [x] 2.1 Add `coverThumb` (text, nullable) column to `packages/database/schema/posts.ts`
- [x] 2.2 Run `pnpm db:generate` to generate migration SQL
- [x] 2.3 Run `pnpm db:migrate` (local) — requires `wrangler dev` running first

## 3. Upload Service

- [x] 3.1 Import `@cf-wasm/photon` in `apps/api/src/services/upload.service.ts`
- [x] 3.2 Add `generateThumb` helper: accepts `ArrayBuffer` + max-width, returns WebP `Uint8Array` using photon resize + encode
- [x] 3.3 Modify `uploadImage`: after uploading original, generate 800px-wide WebP thumb, store at `images/{userId}/{uuid}-thumb.webp`, return `{ url, thumbUrl }`
- [x] 3.4 Modify `uploadAvatar`: after uploading original, generate 256×256 center-crop WebP thumb, store at `avatars/{userId}/{uuid}-thumb.webp`, return `{ url, thumbUrl }`

## 4. Creator Handler

- [x] 4.1 Update `POST /upload` route in `apps/api/src/handlers/creator.handler.ts` to return `{ url, thumbUrl }` from `uploadImage`
- [x] 4.2 Update `POST /posts` to accept `coverThumb` (string | null) and persist it to `posts.coverThumb`
- [x] 4.3 Update `PATCH /posts/:id` to accept `coverThumb` (string | null) and update `posts.coverThumb`
- [x] 4.4 Update `GET /posts` (creator list) to include `coverThumb` in the select

## 5. Posts Handler

- [x] 5.1 Add `coverThumb` to the select in feed query (`GET /`) in `apps/api/src/handlers/posts.handler.ts`
- [x] 5.2 Add `coverThumb` to the select in single-post query (`GET /:slug`)

## 6. Web Layer — Server Functions

- [x] 6.1 Update `uploadImageFn` in `apps/web/src/routes/-fn/creator.ts` to handle `{ url, thumbUrl }` response and return both
- [x] 6.2 Update the creator editor upload handler in `apps/web/src/routes/(app)/_app/creator/$id.tsx` to call `form.setFieldValue("coverThumb", thumbUrl)` after cover image upload

## 7. Web Layer — UI

- [x] 7.1 Add `coverThumb` to the post schema and `defaultValues` in the creator editor form
- [x] 7.2 Wire `coverThumb` into the `createPostFn` / `updatePostFn` payload in the editor's `onSubmit`
- [x] 7.3 Update `PostCard` in `apps/web/src/routes/(app)/_app/feed/-components/post-card.tsx` to use `coverThumb ?? coverImage` as the `<img>` src
- [x] 7.4 Confirm post detail page (`apps/web/src/routes/(app)/_app/feed/$slug.tsx`) uses `coverImage` (original) — no change needed if already using `coverImage` directly

## 8. Verification

- [ ] 8.1 Upload a cover image and verify the API response includes `thumbUrl`
- [ ] 8.2 Verify `thumbUrl` points to a valid WebP file ≤ 800px wide in R2
- [ ] 8.3 Verify feed cards render `coverThumb` when set; verify old posts (null `coverThumb`) fall back to `coverImage` without broken images
- [ ] 8.4 Verify post detail page still shows full-resolution `coverImage`
- [x] 8.5 Run `pnpm test` — no regressions
