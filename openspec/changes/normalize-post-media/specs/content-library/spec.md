## MODIFIED Requirements

### Requirement: Post entity schema

The `posts` table SHALL include `mediaStatus` (`pending | processing | ready | failed`, not null, default `pending`) and `access` (`free | premium`, not null, default `premium`) in addition to existing content columns. The full column set is:

**Existing (unchanged):** `id`, `authorId`, `slug`, `title`, `body`, `tags`, `status`, `publishedAt`, `createdAt`, `updatedAt`

**Added to `posts`:** `mediaStatus` (pipeline gate), `access` (content access tier)

**Removed from `posts`:** `coverImage`, `coverThumb`

**`post_metadata` (one-to-one, mandatory — technical specs only):** `postId` (PK + FK → posts.id), `format`, `resolution`, `duration`, `isLoop`, `fileSize`. Columns removed: `processingStatus`, `fileKey`, `previewKey`, `clipKey`, `access`.

**New table — `post_assets` (one-to-many):** `id` (text PK), `postId` (FK → posts.id, cascade delete), `role` (`cover | thumb | asset`), `key` (R2 key, not null), `format` (text, not null). One row per media variant. Preview and clip variants are explicitly deferred.

**`post_stats` (unchanged):** `id`, `postId`, `userId`, `downloadedAt`.

#### Scenario: Feed filter uses posts.mediaStatus

- **WHEN** the migration and code deployment complete
- **THEN** all feed queries filter on `posts.mediaStatus = 'ready'` instead of `post_metadata.processingStatus = 'ready'`; the INNER JOIN on `post_metadata` for visibility gating is removed

#### Scenario: fileKey excluded from all public API responses

- **WHEN** `GET /api/v1/posts` or `GET /api/v1/posts/:slug` returns a post
- **THEN** the response body MUST NOT contain any R2 key; only derived URLs (`coverUrl`, `thumbUrl`, `previewUrl`, `clipUrl`) are present

---

### Requirement: Feed list API returns media as derived URLs

`GET /api/v1/posts` SHALL LEFT JOIN `post_assets` per post, aggregate keys by role using `JSON_GROUP_OBJECT`, and return `coverUrl` and `thumbUrl` (each nullable). The INNER JOIN on `post_metadata` for processing status is removed; `posts.mediaStatus = 'ready'` is the sole visibility filter for media readiness.

#### Scenario: Feed returns media URLs not keys

- **WHEN** a member calls `GET /api/v1/posts`
- **THEN** each item includes `coverUrl` and `thumbUrl` as absolute URLs or `null`; no raw R2 keys; still includes `format`, `resolution`, `access`, `downloadCount`; `previewUrl` and `clipUrl` are NOT present

#### Scenario: Post with no cover returns null coverUrl

- **WHEN** a post without a `cover` row in `post_assets` appears in the feed
- **THEN** `coverUrl` is `null`

---

### Requirement: Single post API includes full asset spec

`GET /api/v1/posts/:slug` SHALL return all asset URLs and `post_metadata` spec fields. The visibility filter is `posts.status = 'published' AND posts.mediaStatus = 'ready'`.

#### Scenario: Post detail includes media URLs and spec

- **WHEN** a member calls `GET /api/v1/posts/:slug` for a video post
- **THEN** the response includes `coverUrl`, `thumbUrl`, `format`, `resolution`, `duration`, `isLoop`, `fileSize`, `access`, `downloadCount`; `previewUrl` and `clipUrl` are NOT present
