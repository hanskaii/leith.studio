## 1. API — Expose fileUrl in Feed & Post Responses

- [x] 1.1 In `apps/api/src/handlers/posts.handler.ts` `GET /`, add `fileKey: postMetadata.fileKey` to the select and compute `fileUrl` as `fileKey ? \`${new URL(c.req.url).origin}/api/files/${fileKey}\` : null` in the response mapping
- [x] 1.2 In `apps/api/src/handlers/posts.handler.ts` `GET /:slug`, add `fileKey: postMetadata.fileKey` to the select and compute `fileUrl` the same way, returning it alongside the post fields

## 2. Web — PostCard Hover Video

- [x] 2.1 In `apps/web/src/routes/(app)/_app/feed/-components/post-card.tsx`, add a `isHovered` boolean state (useState) to `PostCard`
- [x] 2.2 Add `onPointerEnter` / `onPointerLeave` handlers to the media container `<div>` that set `isHovered`
- [x] 2.3 Define `isVideo` as `["mp4", "webm"].includes((post as any).format)` and `fileUrl` from `(post as any).fileUrl`
- [x] 2.4 When `isHovered && isVideo && fileUrl`, render `<video autoPlay muted loop playsInline>` with `src={fileUrl}` filling the aspect-ratio container; otherwise render the existing `<img>`

## 3. Web — Post Detail Video Player

- [x] 3.1 In `apps/web/src/routes/(app)/_app/feed/$slug.tsx` `PostContent`, read `(post as any).format` and `(post as any).fileUrl`
- [x] 3.2 Replace the static `{post.coverImage && <img ...>}` block with a conditional: if `isVideo && fileUrl`, render `<video autoPlay muted loop playsInline controls className="w-full aspect-[16/9] rounded-md overflow-hidden mb-8" src={fileUrl} />`; else keep the existing `<img>` block

## 4. Verification

- [ ] 4.1 Confirm `GET /api/v1/posts` response includes `fileUrl` (non-null for video posts, null for image posts)
- [ ] 4.2 Confirm hovering a video post card in the feed plays the video and shows the thumbnail again on leave
- [ ] 4.3 Confirm image post cards show no change in hover behavior
- [ ] 4.4 Confirm post detail page shows a video player for video posts and a cover image for image posts
- [x] 4.5 Run `pnpm test` — no regressions
