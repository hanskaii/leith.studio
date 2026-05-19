## Context

Posts can carry video assets (mp4/webm). The `postMetadata` table stores `fileKey`, `format`, `resolution`, `duration`, `isLoop`. Currently the feed listing API does not expose `fileKey` or a derived asset URL, so the web has no way to reference the video for inline playback. The detail page uses a static `<img>` for the cover regardless of post format.

The R2 asset serving endpoint exists at `/api/files/:key` (used by the upload-asset route response). No auth is required to serve files from R2 — the endpoint is a pass-through proxy.

## Goals / Non-Goals

**Goals:**

- Feed cards for video posts play the asset inline on hover (muted, autoplay, looping, no controls shown)
- Post detail page shows a video player (muted autoplay loop, controls visible) for video-format posts
- Static image posts are completely unaffected
- No new npm dependencies — use native `<video>` elements

**Non-Goals:**

- Separate "preview clip" transcoding or a separate preview asset (use the full asset)
- Seeking/progress controls on the hover preview in the feed card
- Subtitles, captions, or audio on the detail player

## Decisions

### D1: Expose asset URL via feed API (not fileKey)

**Decision**: Add a computed `fileUrl` field to the feed listing and single-post API responses, constructed server-side as `${origin}/api/files/${fileKey}`. Do not expose raw `fileKey` in public responses.

**Rationale**: The web layer shouldn't need to know the internal URL structure of R2. Constructing the URL server-side keeps that coupling in one place (the handler). Exposing `fileKey` directly gives clients enough information to enumerate all assets.

**Alternative**: Expose `fileKey` and let the client construct the URL. Rejected — leaks internal storage path structure.

### D2: Lazy video element on hover (mount on enter, unmount on leave)

**Decision**: The `PostCard` component renders no `<video>` element until the user hovers. On `pointerenter`, mount a `<video>` with `autoPlay muted loop playsInline` and the asset URL as `src`. On `pointerleave`, unmount it and show the static thumbnail again.

**Rationale**: Mounting on hover avoids loading video metadata for every card on the page. With 12+ cards per page, eager mounting would issue 12+ range requests simultaneously, harming initial load.

**Alternative**: Render `<video>` hidden and set `autoplay` on hover. Rejected — browsers may preload video data even when display:none.

**Alternative**: Use a CSS hover transition with `opacity`. Rejected — opacity doesn't stop preload.

### D3: Conditional render in detail page (video vs image)

**Decision**: `PostContent` checks `post.format` against `["mp4", "webm"]`. If video, render `<video autoPlay muted loop playsInline controls src={post.fileUrl} />`. If not, keep the existing `<img>` with `coverImage`.

**Rationale**: Simple conditional; no abstraction needed for two branches.

### D4: Feed tag filter must not lose `fileUrl` / `format`

The current feed query uses `innerJoin` on `postMetadata` — only posts with metadata get included. Video posts always have metadata, so no change needed to the join strategy.

## Risks / Trade-offs

- **Large file on hover**: Assets can be up to 200 MB. A hover-triggered autoplay will start buffering. Mitigation: the `<video>` element streams on demand; users who briefly hover will trigger a small initial buffer only. Bandwidth cost is accepted as a UX trade-off.
- **`/api/files/:key` public access**: If this endpoint currently requires auth, video preview on the public feed will fail. Mitigation: verify/ensure the files endpoint serves R2 objects without auth (it should — it's a CDN-style proxy).
- **`fileUrl` field type safety**: The feed response type is inferred via Hono RPC. Adding `fileUrl` to the select will require updating the `PostsData` type used in the web layer. This flows automatically through the RPC contract — no manual type changes needed.

## Migration Plan

1. Add `fileUrl` to `GET /posts` and `GET /posts/:slug` handler selects (computed from `fileKey` + `origin`)
2. Update `PostCard` with hover state
3. Update `PostContent` with conditional video/image
4. No database migration needed
5. No deployment coordination needed — additive change, old clients just ignore `fileUrl`
