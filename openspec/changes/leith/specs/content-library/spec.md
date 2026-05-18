## MODIFIED Requirements

### Requirement: Post entity schema

The `posts` table SHALL include asset metadata columns in addition to existing content columns. The full column set is:

**Existing (unchanged):** `id`, `slug`, `title`, `body`, `coverImage`, `tags`, `status`, `publishedAt`, `createdAt`, `updatedAt`

**No new columns added to `posts`.** The `posts` table stays clean — content and publishing fields only.

**New table — `post_metadata` (one-to-one, mandatory):** `postId` (text, PK + FK → posts.id), `format` (text, not null, one of `"mp4"` | `"png"` | `"jpg"` | `"webm"`), `resolution` (text, not null), `duration` (integer seconds, nullable — null for images), `isLoop` (integer 0/1, not null, default 0), `fileKey` (text, not null — R2 key, never returned to clients), `fileSize` (integer, not null), `access` (text, not null, default `"premium"`, one of `"free"` | `"premium"`). Every post MUST have a corresponding `post_metadata` row — there are no text-only posts on Leith.

**New table — `post_stats` (one-to-many):** `id` (cuid, PK), `postId` (text, FK → posts.id, not null), `userId` (text, FK → users.id, not null), `downloadedAt` (integer timestamp, not null). Index on `postId`. Download count is always `SELECT COUNT(*) FROM post_stats WHERE postId = ?`.

#### Scenario: Existing posts after migration

- **WHEN** the migration runs
- **THEN** `post_metadata` and `post_stats` tables are created empty; existing `posts` rows are unchanged; no data migration needed

#### Scenario: fileKey excluded from public API response

- **WHEN** `GET /api/v1/posts` or `GET /api/v1/posts/:slug` returns a post
- **THEN** the response body MUST NOT contain `fileKey`; asset fields returned (from INNER JOIN `post_metadata`): `format`, `resolution`, `duration`, `isLoop`, `fileSize`, `access`, `downloadCount` (derived from `post_stats` COUNT)

---

### Requirement: Feed list API joins post_metadata

`GET /api/v1/posts` SHALL INNER JOIN `post_metadata` on each post and return `format`, `resolution`, `isLoop`, `access`, `downloadCount` (derived). `fileKey` is excluded.

#### Scenario: Feed returns asset metadata

- **WHEN** a member calls `GET /api/v1/posts`
- **THEN** each item in `data` includes `format`, `resolution`, `access`, `downloadCount`; `fileKey` is absent

---

### Requirement: Single post API includes full asset spec

`GET /api/v1/posts/:slug` SHALL return all asset fields except `fileKey`.

#### Scenario: Post detail includes spec fields

- **WHEN** a member calls `GET /api/v1/posts/:slug` for a video post
- **THEN** the response includes `format`, `resolution`, `duration`, `isLoop`, `fileSize`, `access`, `downloadCount`
