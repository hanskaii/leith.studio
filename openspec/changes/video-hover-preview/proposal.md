## Why

Video posts currently display only a static cover image everywhere. Visitors get no sense of motion before committing to open the detail page, which reduces engagement. On the detail page, there is no video playback at all — users who want to preview the actual asset must download it first.

## What Changes

- Feed cards for video posts show the static `coverThumb` by default; hovering plays the looping video asset inline (muted, autoplay, no controls).
- Post detail page renders an inline video player (muted autoplay loop, with controls) instead of just the cover image when the post has a video asset.
- Static image posts are unaffected.

## Capabilities

### New Capabilities

- `video-hover-preview`: PostCard detects video format posts and swaps the cover image for a looping `<video>` element on pointer enter; reverts on pointer leave.
- `video-detail-player`: Post detail page shows an embedded video player for video-format posts, replacing the static cover image display.

### Modified Capabilities

- `content-library`: PostCard behavior changes — image-only posts unchanged; video posts gain hover interaction. Detail page gains conditional video rendering.

## Impact

- `apps/web/src/routes/(app)/_app/feed/-components/post-card.tsx` — hover state logic, conditional `<video>` element
- `apps/web/src/routes/(app)/_app/feed/$slug.tsx` — conditional video player in `PostContent`
- `apps/api/src/handlers/posts.handler.ts` — `GET /` feed must include `fileKey` or a public asset URL so the web can resolve the video src; currently `fileKey` is not exposed in the feed listing
- `apps/api/src/handlers/creator.handler.ts` — may need to expose a public URL helper for assets
- No new dependencies required (native `<video>` element)
- No database schema changes needed
