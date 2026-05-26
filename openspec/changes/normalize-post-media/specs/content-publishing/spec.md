## MODIFIED Requirements

### Requirement: Creator API upserts post_assets and posts.mediaStatus

`POST /api/v1/creator/posts` and `PATCH /api/v1/creator/posts/:id` SHALL accept `fileKey`, `format`, `resolution`, `duration`, `isLoop`, `fileSize`, `access` as optional fields. When `fileKey` is present, the handler SHALL upsert a `post_assets` row with `role = 'asset'` and set `posts.mediaStatus = 'ready'` (no async processing step). `access` SHALL be written to `posts.access`, not `post_metadata`. When none of the asset fields are present, neither `post_assets` nor `posts.mediaStatus` is touched. The handler MUST NOT trigger `VIDEO_PROCESSING_WORKFLOW`.

#### Scenario: Create post with asset file

- **WHEN** a creator submits a new post with `fileKey`, `format: "mp4"`, `resolution: "1920×1080"`, `fileSize: 52428800`, `access: "premium"`
- **THEN** a `post_assets` row is inserted with `role = 'asset'`, `key = fileKey`, `format = "mp4"`; `posts.access` is set to `"premium"`; `posts.mediaStatus` is set to `"ready"`; no video processing workflow is triggered

#### Scenario: Update access tier only

- **WHEN** a creator patches a post with `{ access: "free" }`
- **THEN** `posts.access` is updated to `"free"`; `post_assets` and `posts.mediaStatus` are unchanged

#### Scenario: Replace file updates asset row in place

- **WHEN** a creator patches a post with a new `fileKey`
- **THEN** the existing `role = 'asset'` row in `post_assets` is replaced with the new key; `posts.mediaStatus` stays `"ready"`; no processing workflow is triggered

---

### Requirement: Creator can upload asset file

The creator upload flow SHALL accept an asset file (MP4, PNG, JPG, WebP up to 200MB) via `POST /api/v1/creator/upload`. The response returns `{ url: string, key: string }` — the `key` is stored as the `post_assets` asset row key. The URL is for display only and MUST NOT be persisted.

#### Scenario: Valid asset upload

- **WHEN** a creator uploads an MP4 file ≤ 200MB
- **THEN** the file is stored in R2, the handler returns `{ url, key }`, and the editor stores `key` for the subsequent post create/update call

#### Scenario: Oversized file rejected

- **WHEN** a creator uploads a file > 200MB
- **THEN** the API returns 400 with message `"File too large. Maximum size is 200MB."`

---

### Requirement: Studio approve workflow writes to post_assets and posts.mediaStatus

The `studio-approve.workflow.ts` workflow SHALL insert rows into `post_assets` for `cover`, `thumb`, and `asset` roles. It SHALL set `posts.mediaStatus = 'ready'` for both image and video posts (no async pipeline step). It SHALL NOT write to `post_metadata.processingStatus`, `posts.coverImage`, or `posts.coverThumb`. It SHALL NOT trigger `VIDEO_PROCESSING_WORKFLOW`.

#### Scenario: Image post created as ready

- **WHEN** a studio image generation is approved
- **THEN** `post_assets` receives rows for `cover` (image URL converted to R2 key), `thumb` (first-frame key), and `asset` (image file key); `posts.mediaStatus = 'ready'`; `posts.status = 'draft'`

#### Scenario: Video post created as ready, no processing

- **WHEN** a studio video generation is approved
- **THEN** `post_assets` receives rows for `cover`, `thumb`, and `asset`; `posts.mediaStatus = 'ready'`; no processing workflow is triggered

---

### Requirement: Video processing workflow is dormant

The `video-processing.workflow.ts` file SHALL remain in the repository but MUST NOT be triggered by any handler or workflow. Its registration in `wrangler.toml` MAY remain in place; the trigger calls SHALL be removed from `studio-approve.workflow.ts` and `creator.handler.ts`. Re-introducing it is out of scope and will be addressed in a future change.

#### Scenario: No trigger calls in active code

- **WHEN** the codebase is grepped for `VIDEO_PROCESSING_WORKFLOW.create`
- **THEN** zero matches are returned outside of the workflow file itself

#### Scenario: Preview and clip absent for all new posts

- **WHEN** a new post is created via studio approve or creator upload
- **THEN** no `preview` or `clip` rows are inserted into `post_assets`
