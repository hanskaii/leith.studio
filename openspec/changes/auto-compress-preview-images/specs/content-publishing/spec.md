## ADDED Requirements

### Requirement: Posts table stores coverThumb

The `posts` table SHALL have a new nullable `coverThumb` column (text, nullable) that stores the R2 URL of the compressed WebP thumbnail for the cover image. The column is separate from `coverImage` — `coverImage` retains the original upload URL unchanged.

#### Scenario: New post with thumbnail

- **WHEN** a creator uploads a cover image and the service generates a thumbnail
- **THEN** `coverThumb` is stored on the post row alongside `coverImage`

#### Scenario: Legacy post without thumbnail

- **WHEN** a post was created before this change (no `coverThumb` value)
- **THEN** `coverThumb` is NULL; existing behavior is unchanged; no broken images

---

### Requirement: Creator API accepts and persists coverThumb

`POST /api/v1/creator/posts` and `PATCH /api/v1/creator/posts/:id` SHALL accept `coverThumb` (string, nullable) as an optional field. When provided, it SHALL be persisted to the `posts.coverThumb` column.

#### Scenario: Create post with coverThumb

- **WHEN** a creator submits a new post with `{ coverImage: "<url>", coverThumb: "<thumbUrl>" }`
- **THEN** both values are stored; the response includes `coverThumb`

#### Scenario: PATCH updates coverThumb

- **WHEN** a creator patches a post with `{ coverThumb: "<new-thumb-url>" }`
- **THEN** the `posts.coverThumb` column is updated; other fields are unchanged

---

### Requirement: Feed and post-detail API responses include coverThumb

`GET /api/v1/posts` (feed) and `GET /api/v1/posts/:slug` (single post) SHALL include `coverThumb` (string | null) in every post object returned.

#### Scenario: Feed response includes coverThumb

- **WHEN** a client calls `GET /api/v1/posts`
- **THEN** each post object in the response includes `coverThumb` (null if not set)

#### Scenario: Single post response includes coverThumb

- **WHEN** a client calls `GET /api/v1/posts/:slug`
- **THEN** the response post object includes `coverThumb` (null if not set)
