## ADDED Requirements

### Requirement: posts.enrichmentStatus tracks AI enrichment lifecycle

The `posts` table SHALL include an `enrichmentStatus` column with values `pending | processing | done | failed`, nullable. Posts created via the studio upload flow start as `pending`; the enrichment workflow transitions them through `processing` to `done` (or `failed`). Posts created via other paths (studio-approve workflow, manual API) MAY leave this column null.

#### Scenario: Studio upload sets pending

- **WHEN** a post is created via `POST /api/v1/creator/upload`
- **THEN** `enrichmentStatus` is `pending`

#### Scenario: Workflow advances state

- **WHEN** the enrichment workflow starts running for a post
- **THEN** `enrichmentStatus` is updated to `processing`; on success it becomes `done`; on unrecoverable error it becomes `failed`

---

### Requirement: Studio upload endpoint creates a post and triggers enrichment

`POST /api/v1/creator/upload` SHALL accept a multipart file upload, store the file in R2, insert a `posts` row with `status = "draft"`, `mediaStatus = "ready"`, `enrichmentStatus = "pending"`, empty `title`/`body`, insert a `post_assets` row for `role = "asset"`, and trigger the AI enrichment workflow. The response SHALL return the created `postId` and the placeholder post data.

#### Scenario: Single file upload

- **WHEN** a creator uploads one MP4 file
- **THEN** a `posts` row is created, a `post_assets` asset row is inserted, the AI enrichment workflow is triggered, and the response returns `{ postId, post }`

#### Scenario: Multiple files via repeated calls

- **WHEN** the studio UI uploads N files in parallel
- **THEN** N independent calls to `POST /api/v1/creator/upload` succeed; each creates its own post and triggers its own enrichment workflow run

---

### Requirement: AI enrichment workflow fills title, body, tags, and post_metadata

The `ai-enrich.workflow.ts` Cloudflare Workflow SHALL accept `{ postId }` as input. It SHALL read the post and its `asset` row, call the AI model with the file URL, parse the model response into `{ title, description, tags[], format, resolution, duration, isLoop }`, and update the post and `post_metadata` accordingly. It SHALL also INSERT tag rows and `post_tags` joins for any new tags. On completion it SHALL set `enrichmentStatus = "done"`. On unrecoverable failure it SHALL set `enrichmentStatus = "failed"`.

#### Scenario: Successful enrichment

- **WHEN** the workflow runs for a freshly uploaded video
- **THEN** `posts.title`, `posts.body` are populated; `post_metadata` row is upserted with format/resolution/duration/isLoop; `post_tags` rows are created for each tag returned by the model; `enrichmentStatus = "done"`

#### Scenario: AI returns unparseable output

- **WHEN** the model returns text that fails JSON parsing or schema validation
- **THEN** the workflow falls back to placeholder values (`title = filename`, empty body, no tags) and sets `enrichmentStatus = "failed"`; the creator can manually fill the fields via the drawer

#### Scenario: Image enrichment skips video-specific fields

- **WHEN** the workflow runs for a JPG/PNG upload
- **THEN** `duration` and `isLoop` are not set on `post_metadata`; only image-relevant fields (`format`, `resolution`) are populated

---

### Requirement: Studio UI polls for enrichment completion

The `/studio` grid SHALL poll the posts endpoint at a configurable interval (default 5s) for cards in `enrichmentStatus = "processing"` state. When a card transitions to `done` or `failed`, the card UI SHALL refresh to show the new title/description/badge.

#### Scenario: Card refreshes when AI finishes

- **WHEN** a card is in `processing AI` state and the next poll returns `enrichmentStatus = "done"`
- **THEN** the card re-renders with the AI-generated title and a `draft` badge

#### Scenario: No polling for completed cards

- **WHEN** all visible cards are in `done`, `draft`, `published`, or `failed` state
- **THEN** no polling requests are sent until a new upload begins
