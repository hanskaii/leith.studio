## ADDED Requirements

### Requirement: post_assets table stores all media keys by role

The system SHALL maintain a `post_assets` table that stores every R2 media key associated with a post, keyed by role. Valid roles are `cover`, `thumb`, and `asset`. Each row stores the R2 key and the file format. All keys SHALL be R2 object keys (never full URLs). Deletion of a post SHALL cascade to all its asset rows. Preview and clip variants are explicitly out of scope for this change — feed/detail use the original asset file directly.

#### Scenario: Asset roles for a complete post

- **WHEN** a post upload completes
- **THEN** `post_assets` contains rows for `cover`, `thumb`, and `asset` — all pointing to R2 keys

#### Scenario: Role enum rejects preview and clip

- **WHEN** any write attempts to insert a row with `role = 'preview'` or `role = 'clip'`
- **THEN** the insert SHALL fail (enum constraint violation)

#### Scenario: Post deletion cascades to assets

- **WHEN** a post is deleted
- **THEN** all `post_assets` rows for that post are deleted automatically via cascade

---

### Requirement: posts.mediaStatus tracks upload state

The `posts` table SHALL include a `mediaStatus` column (`pending | ready | failed`) that tracks whether the asset file is available in R2, independently of the editorial `status` column. The system (workflows and upload handlers, not creators) is the sole writer of `mediaStatus`. A post with `mediaStatus = 'ready'` has its `asset` row in `post_assets` and the file is in R2.

#### Scenario: Post is ready after upload completes

- **WHEN** a creator uploads an asset and the file is confirmed stored in R2
- **THEN** `posts.mediaStatus` is set to `ready`; the `post_assets` row for `role = 'asset'` is inserted

#### Scenario: Upload failure sets failed state

- **WHEN** the asset upload to R2 fails
- **THEN** `posts.mediaStatus` is set to `failed`; no `post_assets` row for `role = 'asset'` exists

#### Scenario: mediaStatus is independent of editorial status

- **WHEN** a post has `status = 'draft'` and `mediaStatus = 'ready'`
- **THEN** the post is not visible in any public feed (both conditions must be `published` + `ready` for visibility)

---

### Requirement: posts.access declares content access tier

The `posts` table SHALL include an `access` column (`free | premium`) that governs whether the downloadable asset requires an All Access pass. Default is `premium`. This field applies to the entire post — there is no per-asset access control.

#### Scenario: New post defaults to premium

- **WHEN** a post is created without specifying access
- **THEN** `posts.access` is `premium`

#### Scenario: Access tier applies to download gate

- **WHEN** the download endpoint checks whether a user may download
- **THEN** it reads `posts.access` and passes it to `Gate.assert("asset.download")`

---

### Requirement: All media URLs derived from R2 keys at the handler layer

All fields returned to clients that reference media SHALL be URLs derived from R2 keys. The handler layer is the sole point of transformation: `key → ${origin}/api/files/${key}`. No client-facing response SHALL contain a raw R2 key or a pre-built full URL stored in the database.

#### Scenario: Feed response contains only URLs

- **WHEN** `GET /api/v1/posts` returns items
- **THEN** each item has `coverUrl` and `thumbUrl` as either a derived URL or `null` — no raw R2 keys are present; `previewUrl` and `clipUrl` are NOT in the response

#### Scenario: Key-to-URL transform is consistent

- **WHEN** any handler derives a media URL from a `post_assets` key
- **THEN** the URL format is always `${origin}/api/files/${key}`
