## Why

Content creation today is split across two flows: manual editor at `/creator/$id` and conversational AI generation at `/studio/agent`. Neither handles the common case of "I already have files, just help me publish them." This change introduces `/studio` as the unified creator workspace — a Google Drive-style file grid where creators drop assets, AI auto-fills metadata in the background, and creators batch-publish drafts when ready.

## What Changes

- **NEW** `/studio` route — Drive-style file grid (cards), default view for creators, replaces the dead `/studio/review` route
- **NEW** Multi-file upload zone — drag-and-drop or click-to-browse, accepts the same formats as the current uploader (MP4, PNG, JPG, WebP), each file gets a per-row loading indicator
- **NEW** Async AI auto-generation pipeline — on upload, kicks off a job that produces title, description, tags, and asset metadata (format, resolution, duration, isLoop); post is created as `draft` with `mediaStatus = ready` immediately on R2 confirm; AI enrichment runs after and updates the draft when complete
- **NEW** Right-side drawer for edit — clicking a card opens a slide-in drawer (modal-style) with editable title/description/tags/access/cover; saves on blur or explicit save
- **NEW** Batch select + bulk publish — checkbox per card, action bar appears when 1+ selected, "Publish selected" flips all chosen drafts to `status: "published"`
- **NEW** Per-card status badges — `draft`, `published`, `processing AI` (transient while enrichment runs), `failed`

## Capabilities

### New Capabilities

- `studio-workspace`: File management UI at `/studio` — grid view, multi-upload, drawer edit, batch publish, status badges
- `ai-auto-enrich`: Async AI enrichment pipeline that fills title/description/tags/metadata from an uploaded asset

### Modified Capabilities

- `content-publishing`: New `/studio` UI replaces the now-removed `/creator/$id` editor as the primary edit surface; the existing creator API endpoints (`POST/PATCH /api/v1/creator/posts`) are reused unchanged; bulk publish requires either a new endpoint or per-post PATCH calls

## Impact

- **Routes**: `apps/web/src/routes/(app)/_app/studio/index.tsx` (new — the grid); `_app/studio/-components/` (new — file card, upload zone, edit drawer, action bar); `_app/studio/-fn/` or reuse `routes/-fn/creator.ts`
- **AI workflow**: new background job or Cloudflare Workflow for `ai-auto-enrich` — takes a `postId` + `fileKey`, produces metadata, writes back to the post
- **API**: optional new `POST /api/v1/creator/posts/bulk-publish` for atomic batch state change (or fall back to N parallel PATCHes)
- **Existing**: `/studio/agent` route is unchanged; its workflow (`studio-approve`, `studio.agent.ts`) continues to operate
- **Depends on**: `normalize-post-media` (for `post_assets` + `posts.mediaStatus`) and `route-restructure` (for the layout/routing context)
