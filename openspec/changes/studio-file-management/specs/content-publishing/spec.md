## ADDED Requirements

### Requirement: Creator upload endpoint creates draft posts directly

The system SHALL expose `POST /api/v1/creator/upload` that accepts a multipart asset file and creates a complete `posts` + `post_assets` record in one round-trip, returning `{ postId, post }`. This is distinct from the older two-step flow (upload-asset then create-post) and is the primary upload path for the `/studio` UI. The endpoint MUST NOT require `title`, `body`, or `tags` in the request — they default to empty/null and are filled later by the AI enrichment workflow.

#### Scenario: Upload creates ready draft

- **WHEN** a creator POSTs a single file to `/api/v1/creator/upload`
- **THEN** a `posts` row is created with `status = "draft"`, `mediaStatus = "ready"`, `enrichmentStatus = "pending"`, empty `title`, empty `body`; a `post_assets` row for `role = "asset"` is inserted; the AI enrichment workflow is triggered; the response returns `{ postId, post }`

#### Scenario: Title/body not required in upload request

- **WHEN** the request body for upload omits `title` and `body`
- **THEN** the endpoint succeeds; the created post has empty defaults for those fields
