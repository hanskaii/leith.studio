## Context

Post media data is spread across three columns in two tables with inconsistent semantics:

- `posts.coverImage` — stores a **full URL** (from AI generation service)
- `posts.coverThumb` — stores an **R2 key** (e.g. `posts/thumbnail/abc.jpg`)
- `post_metadata.fileKey` — R2 key for the downloadable asset
- `post_metadata.previewKey` — R2 key for browsing preview
- `post_metadata.clipKey` — R2 key for hover clip

Every public query (feed, detail, search, tags) must INNER JOIN `post_metadata` just to filter `processingStatus = 'ready'` — a pipeline state gate that has nothing to do with file specs.

URL transformation logic for `previewKey`/`clipKey` is repeated identically in three places in `posts.handler.ts`. `coverImage` bypasses this entirely (already a URL). Frontend code has a separate `thumbUrl()` helper to handle `coverThumb`. No single pattern governs how keys become URLs.

## Goals / Non-Goals

**Goals:**

- One table (`post_assets`) for all R2 media keys — consistent role-based model, no per-variant migrations
- Pipeline gate (`mediaStatus`) moves to `posts` — eliminates mandatory JOIN for feed visibility
- `access` moves to `posts` — it's a post-level policy, not a file spec
- URL transformation happens in one place in the handler for all keys
- `post_metadata` becomes pure technical spec (format, resolution, duration, isLoop, fileSize)

**Non-Goals:**

- **Preview/clip variants** — deferred. Feed displays static `coverUrl`; full playback uses the original asset file. Preview/clip generation will be added back later (separate change) once core CRUD is stable.
- **Active video processing pipeline** — `video-processing.workflow.ts` is no longer triggered. It stays in the repo (no deletion) for the future re-introduction, but `posts.mediaStatus` transitions directly from `pending` to `ready` after upload completes.
- Per-asset access control (access remains post-level, not per-asset)
- Real-time processing status UI (mediaStatus is a DB field, no WebSocket push)
- Removing `post_metadata` entirely — it retains valuable technical spec fields

## Decisions

### D1: `mediaStatus` as a separate column, not an extended `status` enum

Two options were considered:

- **Opsi 1A**: Extend `posts.status` → `draft | pending | processing | published | failed`
- **Opsi 3**: Add `posts.mediaStatus: pending | processing | ready | failed` alongside existing `status: draft | published`

**Decision**: Opsi 3 — separate column.

**Rationale**: The studio-approve workflow creates posts as `status: "draft"` and immediately triggers video processing. This means a post can legitimately be `draft + processing` simultaneously — the creator hasn't published it, but the system is preparing assets. A single enum cannot represent this intersection. Separate columns keep editorial intent (`status`) independent from pipeline state (`mediaStatus`), which is controlled exclusively by the system.

### D2: `access` moves from `post_metadata` to `posts`

`access: "free" | "premium"` determines whether the downloadable asset is gated. This is a content policy decision that applies to the post as a whole, not to any specific file. Moving it to `posts` means the download gate reads one fewer join.

### D3: `post_assets` aggregated with `JSON_GROUP_OBJECT` in queries

Queries that need all media variants (feed, detail) use:

```sql
JSON_GROUP_OBJECT(post_assets.role, post_assets.key) AS media
```

Then parse in the handler: `media.cover`, `media.thumb`, etc.

**Risk**: `JSON_GROUP_OBJECT` requires SQLite ≥ 3.38.0. D1 tracks SQLite releases and currently supports this, but the version is Cloudflare-managed.

**Alternative considered**: Subqueries per role (`(SELECT key FROM post_assets WHERE postId = posts.id AND role = 'cover')`) — more portable, but N subqueries per query.

**Decision**: `JSON_GROUP_OBJECT`. D1 already uses `JSON_GROUP_ARRAY` throughout the codebase (tags aggregation). If `JSON_GROUP_OBJECT` is unavailable, fallback to subqueries is a mechanical change.

### D4: URL transformation — handler layer only

All `post_assets.key` values are R2 keys (never full URLs). Transformation to `${origin}/api/files/${key}` happens once, in the handler `.map()`, for all roles. `coverImage`'s stored URL is converted to a key at migration time so it follows the same path.

**Exception**: The `/api/files/:key` proxy endpoint is already in place — no new endpoint needed.

### D5: Preview/clip removed, video processing dormant

The original design included `preview` and `clip` roles plus active video processing. Both are deferred:

- `post_assets.role` enum narrows to: `cover | thumb | asset`
- `video-processing.workflow.ts` is no longer wired in (creator handler and studio-approve workflow stop triggering it)
- `posts.mediaStatus` lifecycle simplifies: studio approve sets it to `ready` immediately; uploads transition `pending → ready` after R2 confirms (no async processing step in between)
- `failed` state stays in the enum but is now only triggered by upload failure, not processing failure

**Rationale**: serving the original asset directly avoids the operational complexity of the FFmpeg container pipeline. Hover-preview UX downgrade in feed is accepted as a temporary regression — to be restored when on-the-fly optimization (or restored offline processing) ships.

### D6: Migration strategy — backfill then drop

1. Add new columns/table with nullable constraints
2. Backfill: copy existing keys into `post_assets`; copy `access`/`processingStatus` into `posts`
3. Add NOT NULL constraints / drop old columns in a follow-up migration

This allows zero-downtime deployment if needed: new code reads from `post_assets`; old rows are backfilled before cutover.

## Risks / Trade-offs

- **[Risk] `JSON_GROUP_OBJECT` D1 compatibility** → Mitigation: verify against D1 docs before implementing; fallback is subquery approach (mechanical change)
- **[Risk] `coverImage` is a full URL, not an R2 key** → Must fetch and re-upload to R2 during migration, or store as-is and handle URL vs key detection at read time — cleaner to re-upload at migration
- **[Risk] `post_assets` LEFT JOIN replaces INNER JOIN** → Posts without any assets would now appear in feed. The feed filter `posts.mediaStatus = 'ready'` must be verified as sufficient gate
- **[Risk] Three-location URL transform duplication disappears** → If any callsite had a subtle deviation, normalizing will change behavior. Audit all three transform sites before removing

## Migration Plan

1. Add `posts.mediaStatus`, `posts.access`, create `post_assets` table (migration 0009)
2. Backfill script: for each post with `post_metadata`, insert `post_assets` rows for `cover`/`thumb`/`preview`/`clip`/`asset`; set `posts.mediaStatus` from `post_metadata.processingStatus`; set `posts.access` from `post_metadata.access`
3. Deploy new handler/workflow code that reads from `post_assets` + `posts.mediaStatus`
4. Drop old columns: `posts.coverImage`, `posts.coverThumb`, `post_metadata.processingStatus`, `post_metadata.fileKey`, `post_metadata.previewKey`, `post_metadata.clipKey`, `post_metadata.access` (migration 0010)
