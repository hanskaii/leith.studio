## MODIFIED Requirements

### Requirement: Post entity schema

The `posts` table SHALL include a `coverThumb` nullable column in addition to existing content columns. The full column set is:

**Existing (unchanged):** `id`, `slug`, `title`, `body`, `coverImage`, `tags`, `status`, `publishedAt`, `createdAt`, `updatedAt`

**New column added to `posts`:** `coverThumb` (text, nullable) — R2 URL of the compressed WebP thumbnail. NULL for posts created before this change.

**`post_metadata` table (unchanged from leith):** `postId`, `format`, `resolution`, `duration`, `isLoop`, `fileKey`, `fileSize`, `access`.

**`post_stats` table (unchanged from leith):** `id`, `postId`, `userId`, `downloadedAt`.

#### Scenario: Existing posts after migration

- **WHEN** the migration runs adding the `coverThumb` column
- **THEN** existing `posts` rows have `coverThumb = NULL`; no data migration needed; existing posts continue to render using `coverImage`

#### Scenario: fileKey excluded from public API response

- **WHEN** `GET /api/v1/posts` or `GET /api/v1/posts/:slug` returns a post
- **THEN** the response body MUST NOT contain `fileKey`; `coverThumb` is included (may be null)

---

### Requirement: PostCard uses coverThumb with fallback

The `PostCard` component SHALL render the cover image using `coverThumb` when available, falling back to `coverImage` when `coverThumb` is null. It SHALL NOT use the full-resolution `coverImage` for feed card rendering when a thumbnail is available.

#### Scenario: Post with thumbnail renders compressed variant

- **WHEN** a `PostCard` renders a post where `coverThumb` is set
- **THEN** the `<img>` src is `coverThumb`, not `coverImage`

#### Scenario: Post without thumbnail falls back to original

- **WHEN** a `PostCard` renders a legacy post where `coverThumb` is null
- **THEN** the `<img>` src is `coverImage`; no broken image; bandwidth impact acknowledged

---

### Requirement: Post detail page uses original coverImage

The post detail page (`/$slug`) SHALL always use `coverImage` (full resolution) for the cover image display, not `coverThumb`. The thumbnail is only for feed card previews.

#### Scenario: Detail page shows full resolution

- **WHEN** a user opens a post detail page
- **THEN** the cover image displayed is the original `coverImage` URL at full resolution
