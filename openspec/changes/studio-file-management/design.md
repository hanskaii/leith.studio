## Context

`/studio` becomes the unified creator workspace. The mental model is "Drive for content creators with AI assist." Creators upload files; the system auto-generates metadata in the background; creators review and publish in batch.

This sits on top of two foundational changes:

- `normalize-post-media` provides `post_assets` (one row per file) and `posts.mediaStatus` (ready immediately after R2 upload)
- `route-restructure` provides the consolidated `_app` layout and clears `/studio/review` out of the way

The existing `/studio/agent` chat-based flow stays in place — it serves a different use case (generate-from-scratch) and is out of scope here.

## Goals / Non-Goals

**Goals:**

- Drive-style grid as the default view — file thumbnails, status badges, multi-select
- Multi-file drop with per-file loading state
- AI auto-fills `title`, `description`, `tags`, plus media spec fields (`format`, `resolution`, `duration`, `isLoop`)
- Drawer-style edit panel — slides from right, contains all editable fields, no separate route
- Batch publish — multi-select then flip all to `published` with one action
- Upload completes fast (R2 confirm), AI enrichment runs in background

**Non-Goals:**

- Folders or nested organization (flat list, like the screenshot reference)
- Sort/filter UI beyond what's needed for an MVP (probably just "most recent first")
- Search inside `/studio` (relies on filtering by status badge or scroll)
- Real preview generation (uses original file directly per `normalize-post-media`)
- Replacing or modifying `/studio/agent`
- Permanent storage of "in-progress" uploads — failed enrichment leaves a draft with empty metadata; creator can fill manually

## Decisions

### D1: Upload is two-phase — immediate R2 confirm, async enrichment

Two phases for one logical "upload":

1. **Phase 1 (synchronous from the user's POV):** browser POSTs file to `POST /api/v1/creator/upload`; backend stores in R2, INSERTs `posts` + `post_assets` row, returns `{ postId }`. `mediaStatus = "ready"`. Title/description/tags are empty placeholders.
2. **Phase 2 (background):** the upload handler triggers an AI enrichment job (Cloudflare Workflow or DO RPC) with the new `postId`. Job runs the model, updates `posts.title`, `posts.body`, and `post_tags`. Card UI subscribes (poll or push) and refreshes when done.

**Rationale**: keeping the foreground request fast means batch uploads of 20 files don't block the browser. The user sees cards appear in the grid immediately with a "processing AI" badge.

**Alternative considered**: synchronous enrichment in the upload request. Rejected — a 20-file batch with 5-second AI per file = 100s of blocked uploads.

### D2: Drawer edit, not modal or separate route

Two ways to expose edit UI:

- Modal dialog centered on screen
- Right-side drawer that slides in over the grid

**Decision**: drawer. Allows creators to see the grid context (the card they're editing is still partially visible), supports keyboard navigation between cards without closing/reopening, and matches the Drive UX in the reference screenshot.

### D3: Status badge derived from a single computed field

A card's badge is a function of `(status, mediaStatus, enrichmentStatus)`:

- `mediaStatus = "failed"` → `failed` (upload broke)
- `enrichmentStatus = "processing"` → `processing AI`
- `status = "draft"` → `draft`
- `status = "published"` → `published`

**Decision**: compute the badge in the frontend from these three fields. No new DB column. `enrichmentStatus` is either a new column on `posts` or stored on a related `post_enrichment_jobs` table — D5 below.

### D4: Batch publish — N parallel PATCHes for MVP

Two ways to support "publish all selected":

- New endpoint `POST /api/v1/creator/posts/bulk-publish` — single round-trip, atomic
- N parallel calls to `PATCH /api/v1/creator/posts/:id` with `{ status: "published" }`

**Decision**: start with N parallel PATCHes. Less backend work, the existing endpoint already handles all the validation, and batch sizes are bounded (a creator won't typically publish 100 posts at once). If we hit performance pain, add a bulk endpoint later.

### D5: Enrichment status — new column on posts, not new table

The enrichment job needs a state for the badge:

- New `posts.enrichmentStatus` column (`pending | processing | done | failed`)
- Or separate `post_enrichment_jobs` table

**Decision**: column on `posts`. Single value per post, no history needed for now. Adds one nullable column — small migration.

**Alternative considered**: derive from absence of `title` — rejected because a creator might legitimately save a draft without a title.

### D6: AI enrichment is its own Cloudflare Workflow

The job needs durability (retry on transient failures), step boundaries (model call, parse, DB write), and visibility (workflow runs are inspectable). Cloudflare Workflows is already in the stack (`studio-approve.workflow.ts`, `video-processing.workflow.ts`).

**Decision**: implement as `ai-enrich.workflow.ts`, triggered by the upload handler. Steps: (1) read post + asset, (2) call AI model with file URL, (3) parse response, (4) update posts row + insert post_tags.

## Risks / Trade-offs

- **[Risk] AI enrichment failure leaves drafts in awkward state** → creator can manually edit; failed status badge surfaces the issue; enrichment can be retried via a "Re-run AI" button on the card (deferred — manual edit is sufficient for MVP)
- **[Risk] Drawer state vs URL** → when drawer opens for a card, URL should reflect the selected post (e.g. `?selected=postId`) so refresh and deep links work; TanStack Router search params handle this
- **[Risk] Multi-upload simultaneous AI calls hit rate limits** → enrichment workflow has its own retry/backoff; the upload handler doesn't block on enrichment so rate-limit pressure is decoupled from UI responsiveness
- **[Risk] Polling for enrichment status is wasteful** → for MVP, poll every 5s for cards in `processing AI` state; switch to WebSocket/SSE later if needed
- **[Risk] Grid performance with many files** → virtualize the grid if creators exceed ~200 cards; defer until measured
- **[Risk] `creator.handler.ts` POST currently requires explicit title/body** → the upload-driven flow needs a variant or a way to create with placeholder content; either relax the schema or add a dedicated `POST /api/v1/creator/upload` that creates the post too
