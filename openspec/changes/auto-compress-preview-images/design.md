## Context

The upload service (`apps/api/src/services/upload.service.ts`) stores images directly to R2 at full resolution using `file.arrayBuffer()`. Feed cards render every cover image at a fixed 16:9 aspect with CSS `object-cover`, so a 4 MB original is downloaded just to display a 400×225 px thumbnail. The `posts` table has `coverImage` (text, nullable) but no thumbnail variant column.

Cloudflare Workers support WASM execution. `@cf-wasm/photon` is a port of the Photon image processing library compiled to WASM, designed specifically for Workers — it resizes and encodes images with no native binary dependencies and fits within the Workers free-tier CPU budget for typical cover image sizes.

## Goals / Non-Goals

**Goals:**

- Auto-generate a compressed WebP thumbnail (≤ 800px wide, 80% quality) on every cover image upload
- Auto-generate a 256×256 WebP thumbnail on every avatar upload
- Persist `coverThumb` on posts; serve it from feed and post-detail API responses
- Feed cards use `coverThumb`; post detail page uses original `coverImage` for full quality
- Zero manual steps for the creator — happens automatically on upload

**Non-Goals:**

- Resizing asset files (MP4/PNG downloads managed by `upload-asset` route) — those are downloads, not previews
- Client-side compression — processing on the server keeps quality control in one place
- Lazy/on-demand resizing via CDN transform URL (requires Cloudflare Images paid product)
- Retroactively generating thumbnails for existing posts (out of scope; fallback to `coverImage` handles it)

## Decisions

### D1: WASM processing via `@cf-wasm/photon`

**Chosen**: `@cf-wasm/photon` in the API Worker.

**Alternatives considered**:

- `sharp` — requires Node.js native binaries, not compatible with Cloudflare Workers
- Cloudflare Image Resizing (`fetch` with `cf.image`) — requires Pro plan or Cloudflare Images product; adds external dependency per request
- Client-side (`browser-image-compression`) — moves responsibility to the client, loses server-side quality guarantees, increases upload payload variability

`@cf-wasm/photon` executes entirely within the Worker, no external calls. CPU time for a typical 2 MB JPEG resize to 800px is well within Workers' 50 ms CPU limit.

### D2: Thumbnail dimensions — 800px max width, aspect preserved

Feed cards are at most `~800px` wide on desktop (68ch container, 2-column grid). Capping at 800px covers all use cases while cutting file size by ~70–80% vs a typical 3 MP original.

Avatar thumbnails are 256×256 (square crop, center) to match `<Avatar>` usage throughout the app.

### D3: WebP output format

WebP at 80% quality gives smaller files than JPEG at equivalent visual quality and is universally supported in modern browsers. The original is kept in its uploaded format; only the thumbnail is converted.

### D4: `coverThumb` as a separate nullable column

Adding `coverThumb` (text, nullable) to `posts` rather than replacing `coverImage` means:

- Existing posts continue to work (fallback path)
- Post detail page can still serve the original at full quality
- No destructive migration needed

## Risks / Trade-offs

**WASM bundle size** → `@cf-wasm/photon` adds ~2 MB to the Worker bundle. Cloudflare's Worker size limit is 10 MB (compressed). Current bundle is well under this; acceptable.

**CPU time on large uploads** → A 5 MB PNG could approach the CPU limit. Mitigation: enforce the existing 2 MB file size cap strictly before processing; cover images are already limited to 2 MB.

**No retroactive thumbnails** → Existing posts will show `coverImage` in feed cards (full resolution). Mitigation: the `PostCard` fallback `coverThumb ?? coverImage` handles this transparently — no broken images, just sub-optimal bandwidth for old posts.

**WASM cold-start latency** → WASM module init adds ~5–10 ms on first invocation per isolate lifetime. Subsequent invocations in the same isolate reuse the module. Negligible for upload flows.

## Migration Plan

1. Add `@cf-wasm/photon` to `apps/api`
2. Modify `UploadService` — thumbnail generation is additive, original upload path unchanged
3. Add `coverThumb` column migration, run `pnpm db:generate && pnpm db:migrate`
4. Update creator handler to accept/return `coverThumb`
5. Update posts handler to include `coverThumb` in select
6. Update web layer — `PostCard` uses `coverThumb ?? coverImage`
7. Deploy; existing posts fall back to `coverImage` automatically

Rollback: revert upload service change; `coverThumb` column is nullable so old code ignores it safely.
