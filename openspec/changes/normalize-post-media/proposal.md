## Why

Media storage for posts is scattered across three columns in two tables (`coverImage`/`coverThumb` in `posts`, `fileKey`/`previewKey`/`clipKey` in `post_metadata`), with inconsistent semantics — `coverImage` stores a full URL while all other keys store R2 paths. Adding any new media variant requires a schema migration. The pipeline visibility gate (`processingStatus`) lives in `post_metadata` forcing an INNER JOIN on every public query just to filter feed visibility.

## What Changes

- **NEW** `post_assets` table — normalizes all R2 media keys into rows keyed by `role` (`cover`, `thumb`, `asset`); each row holds a key and format. Preview and clip variants are explicitly deferred — feed/detail use the original asset file directly until on-the-fly optimization is added later
- **NEW** `posts.mediaStatus` column — moves the pipeline visibility gate (`pending | processing | ready | failed`) from `post_metadata` into `posts`, eliminating the mandatory INNER JOIN for feed visibility
- **MODIFIED** `posts` table — add `mediaStatus`, add `access` (moved from `post_metadata`), remove `coverImage`, `coverThumb`
- **MODIFIED** `post_metadata` table — remove `processingStatus`, `fileKey`, `previewKey`, `clipKey`, `access`; retains only technical file specs (`format`, `resolution`, `duration`, `isLoop`, `fileSize`)
- **BREAKING** API response shape changes — `coverImage`/`coverThumb` replaced by `coverUrl`/`thumbUrl`; `previewUrl` and `clipUrl` removed entirely (feed/detail consumers use `coverUrl` for static display and the asset endpoint for full playback); all media URLs derived from R2 keys in the handler

## Capabilities

### New Capabilities

- `post-media-assets`: Normalized media asset storage and retrieval — `post_assets` table, role-based key lookup, unified URL transformation at the handler layer

### Modified Capabilities

- `content-library`: Feed query filter changes from `postMetadata.processingStatus = 'ready'` to `posts.mediaStatus = 'ready'`; response shape gains `coverUrl`/`thumbUrl`, loses `coverImage`/`coverThumb`
- `content-publishing`: Write paths for studio-approve and video-processing workflows update from column mutations to `post_assets` inserts; `posts.mediaStatus` replaces `postMetadata.processingStatus` as the pipeline state signal
- `asset-download`: Download endpoint queries `post_assets WHERE role = 'asset'` for the file key and format, instead of `postMetadata.fileKey`; `access` now read from `posts.access`

## Impact

- **Schema**: `packages/database/schema/posts.ts`, `post-metadata.ts` — new columns, dropped columns, new `post_assets` table
- **Migration**: destructive — existing `coverImage`/`coverThumb`/`fileKey`/`processingStatus`/`access` data must be backfilled into `post_assets` and `posts` before columns are dropped. Existing `previewKey`/`clipKey` data is discarded (R2 objects can be cleaned up separately)
- **API handlers**: `posts.handler.ts`, `creator.handler.ts` — query rewrites
- **Workflows**: `studio-approve.workflow.ts` — write path changes. `video-processing.workflow.ts` is removed from the active path (kept in repo but no longer triggered) since preview/clip generation is deferred
- **Web**: `apps/web/src/routes/-fn/posts.ts` and consuming components — field renames; remove hover-clip behaviour in feed (uses static cover only)
