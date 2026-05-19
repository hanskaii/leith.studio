## Why

Cover images are uploaded at full resolution and served as-is for both the feed card previews and post detail pages. Feed cards only display a 16:9 thumbnail — serving a 3–5 MB original here wastes bandwidth and slows page load. Every image should automatically produce a compressed preview variant at upload time.

## What Changes

- `UploadService.uploadImage` generates a WebP thumbnail (max 800px wide, 80% quality) alongside the original on every cover image upload, storing it at `images/{userId}/{uuid}-thumb.webp`
- `UploadService.uploadAvatar` similarly generates a 256×256 WebP thumbnail for avatar use
- Both upload endpoints return `{ url, thumbUrl }` instead of just `{ url }`
- Creator handler stores `thumbUrl` on the post as `coverThumb` (new nullable column)
- Feed (`GET /`) and single-post (`GET /:slug`) responses include `coverThumb`
- `PostCard` and post detail page use `coverThumb` for the cover image when present, falling back to `coverImage`

## Capabilities

### New Capabilities

- `image-variants`: On-upload WASM image processing generating a compressed WebP thumbnail alongside every uploaded image; upload API returns both `url` and `thumbUrl`

### Modified Capabilities

- `content-publishing`: `posts` table gains a nullable `coverThumb` column; creator `POST /posts` and `PATCH /posts/:id` accept and persist `coverThumb`; feed and post-detail responses include the field
- `content-library`: `PostCard` and post detail page consume `coverThumb` with fallback to `coverImage`

## Impact

- **`apps/api/src/services/upload.service.ts`**: add `@cf-wasm/photon` for WASM resize; `uploadImage` and `uploadAvatar` return `{ url, thumbUrl }`
- **`apps/api/src/handlers/creator.handler.ts`**: `POST /posts`, `PATCH /posts/:id`, `POST /upload` — accept `coverThumb`, return it in `GET /posts`
- **`apps/api/src/handlers/posts.handler.ts`**: include `coverThumb` in feed and single-post selects
- **`packages/database/schema/posts.ts`**: add `coverThumb` (text, nullable)
- **`apps/web/src/routes/(app)/_app/feed/-components/post-card.tsx`**: prefer `coverThumb` over `coverImage`
- **`apps/web/src/routes/(app)/_app/feed/$slug.tsx`**: use original `coverImage` on detail page (full quality)
- **New dependency**: `@cf-wasm/photon` in `apps/api`
