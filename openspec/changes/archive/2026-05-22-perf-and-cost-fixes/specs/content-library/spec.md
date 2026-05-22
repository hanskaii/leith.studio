## MODIFIED Requirements

### Requirement: Feed pagination is server-driven

The feed page MUST pass the current URL `page` parameter to the server query so that pages 2+ return the correct offset of results from D1. The client MUST NOT slice a single page-1 response to simulate pagination.

#### Scenario: User navigates to page 2 of the feed

- **WHEN** the user navigates to `/feed?page=2`
- **THEN** the API is called with `page=2`
- **AND** the response contains the second set of posts (offset 12)
- **AND** the feed grid shows different posts than page 1

#### Scenario: Tag filter combined with pagination

- **WHEN** the user navigates to `/feed?tag=loop&page=2`
- **THEN** the API is called with `page=2` and `tag=loop`
- **AND** only loop-tagged posts at the correct offset are returned

---

### Requirement: Client query cache lifetimes are defined

All TanStack Query options that fetch API data MUST declare an explicit `staleTime` so client-side navigations reuse cached results instead of refetching on every component mount.

Required stale times:

- `tagsQueryOptions`: 5 minutes
- `postQueryOptions` (single post): 5 minutes
- `postStatsQueryOptions`: 5 minutes
- `postsQueryOptions` (feed list): 30 seconds
- `searchPostsQueryOptions`: 1 minute

#### Scenario: User navigates away from feed and back within staleTime

- **WHEN** the user visits the feed page, then navigates to a post detail, then navigates back within 30 seconds
- **THEN** the feed data is served from the TanStack Query cache
- **AND** no new network request is made to `GET /api/v1/posts`

#### Scenario: Tags do not refetch on every feed mount

- **WHEN** the search dialog is opened, tags are loaded
- **AND** the dialog is closed and re-opened within 5 minutes
- **THEN** the tags list is served from cache with no new network request

---

### Requirement: downloadCount is computed via JOIN

The `GET /api/v1/posts` feed query, `GET /api/v1/posts/:slug` single-post query, and the `PATCH /posts/:id` updated-row SELECT in `creator.handler.ts` MUST compute `downloadCount` using a `LEFT JOIN` on `postStats` aggregated within the existing `GROUP BY posts.id` clause. Correlated subqueries (`SELECT COUNT(*) FROM postStats WHERE postId = posts.id`) are NOT permitted in these queries.

#### Scenario: Feed page loads with correct download counts

- **WHEN** a user requests `GET /api/v1/posts`
- **THEN** each item in the response has a `downloadCount` field reflecting the number of rows in `post_stats` for that post
- **AND** posts with zero downloads have `downloadCount: 0`

#### Scenario: SQL execution plan does not contain correlated subquery

- **WHEN** the feed query is executed
- **THEN** `downloadCount` is derived from a single aggregation pass over the joined tables
- **AND** no nested `SELECT COUNT(*)` per-row executes

---

### Requirement: upsertPostTags executes in 2 queries regardless of tag count

The tag upsert operation in `creator.handler.ts` (and the equivalent inline block in `studio-approve.workflow.ts`) MUST complete in exactly 2 D1 queries for any number of tags:

1. Bulk `INSERT OR IGNORE INTO tags` for all tag names at once
2. `SELECT id, slug FROM tags WHERE slug IN (…)` to retrieve canonical IDs, followed by a bulk `INSERT OR IGNORE INTO post_tags`

Sequential per-tag loops that issue 3 round-trips per tag (insert → select → insert) are NOT permitted.

#### Scenario: Creator saves a post with 6 tags

- **WHEN** the creator submits a post with 6 tags
- **THEN** the tags are persisted using at most 2 D1 queries
- **AND** all 6 tags appear in the `post_tags` junction table

#### Scenario: Tags already exist in the tags table

- **WHEN** all provided tag names already exist (slugs present in `tags`)
- **THEN** the bulk insert uses `onConflictDoNothing` and no error is thrown
- **AND** the post_tags rows are inserted correctly using the pre-existing tag IDs

---

### Requirement: Files endpoint supports partial content (Range requests)

`GET /api/files/*` MUST inspect the `Range` request header and, when present and valid, return a `206 Partial Content` response with only the requested byte range. When no `Range` header is present, the endpoint MUST return `200 OK` with the full object body as before. The response MUST include `Accept-Ranges: bytes` on all file responses.

#### Scenario: Browser video player seeks to a position

- **WHEN** a browser sends `GET /api/files/posts/video/{id}.mp4` with header `Range: bytes=1048576-2097151`
- **THEN** the response status is `206 Partial Content`
- **AND** the response body contains only bytes 1048576–2097151
- **AND** the response includes `Content-Range: bytes 1048576-2097151/{total}` header

#### Scenario: First play (no Range header)

- **WHEN** a browser sends `GET /api/files/posts/video/{id}.mp4` with no `Range` header
- **THEN** the response status is `200 OK`
- **AND** the full object body is returned
- **AND** the response includes `Accept-Ranges: bytes`

#### Scenario: Malformed Range header

- **WHEN** the `Range` header value is not a valid `bytes=` range
- **THEN** the endpoint ignores the Range header and returns `200 OK` with the full body

---

### Requirement: Search dialog thumbnails display correctly for all posts

The command palette search dialog MUST construct the `coverThumb` image URL as a full `/api/files/{key}` path when rendering post thumbnails. Using the raw R2 key as an `<img src>` attribute is NOT permitted.

#### Scenario: Search results show thumbnails for studio-approved posts

- **WHEN** the user types a query in the command palette that returns studio-approved posts
- **THEN** each result with a `coverThumb` key renders an `<img>` pointing to `/api/files/{coverThumb}`
- **AND** the image loads successfully (HTTP 200 from the files endpoint)

#### Scenario: Posts with no coverThumb show a placeholder

- **WHEN** a search result has `coverThumb: null`
- **THEN** the `<img>` element is replaced with the muted placeholder div
