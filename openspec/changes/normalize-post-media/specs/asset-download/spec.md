## MODIFIED Requirements

### Requirement: Authenticated download gate

A user MUST be authenticated to download any asset. Downloads SHALL be blocked at the API layer via `authMiddleware` before any Gate check runs. The download endpoint SHALL resolve the file key from `post_assets WHERE role = 'asset'` and the access tier from `posts.access`.

#### Scenario: Anonymous user attempts download

- **WHEN** an unauthenticated request hits `GET /api/v1/posts/:slug/download`
- **THEN** the API returns 401 Unauthorized

#### Scenario: Logged-in user downloads a free asset

- **WHEN** a user with role `user` requests a post where `posts.access = "free"` and a `post_assets` row with `role = 'asset'` exists
- **THEN** the API streams the file with correct `Content-Type` and `Content-Disposition: attachment` headers

#### Scenario: Logged-in user attempts premium asset without pass

- **WHEN** a user with role `user` requests a post where `posts.access = "premium"`
- **THEN** the API returns 403 with `code: "ACCESS_REQUIRED"` and message `"All Access pass required."`

#### Scenario: Member downloads a premium asset

- **WHEN** a user with role `member` requests a post where `posts.access = "premium"` and a `post_assets` row with `role = 'asset'` exists
- **THEN** the API streams the file successfully

---

### Requirement: R2 proxy — no key exposure

The download endpoint SHALL fetch the file from R2 using the `STORAGE` binding and stream it directly to the client. The R2 object key MUST NOT appear in any API response body, URL, or header sent to the client.

#### Scenario: File streamed without buffering

- **WHEN** the handler retrieves `STORAGE.get(assetRow.key)`
- **THEN** the response body is piped as a `ReadableStream` — it SHALL NOT be read into an `ArrayBuffer` first

#### Scenario: File not found in R2

- **WHEN** `STORAGE.get(key)` returns `null`
- **THEN** the API returns 404 with message `"Asset file not found."`

---

### Requirement: Missing asset row returns 404

If a post has no `post_assets` row with `role = 'asset'`, the download endpoint SHALL return 404. This replaces the previous check for a missing `post_metadata` row.

#### Scenario: No asset row for post

- **WHEN** a request hits `GET /api/v1/posts/:slug/download` and no `post_assets` row with `role = 'asset'` exists for that post
- **THEN** the API returns 404 with message `"Asset file not found."`

---

### Requirement: Download event recorded in post_stats

Every successful file stream SHALL insert a row into `post_stats`. The insert SHALL be fire-and-forget — it MUST NOT block or delay the streaming response.

#### Scenario: Download event persisted

- **WHEN** a file is successfully streamed to a user
- **THEN** a new row is inserted into `post_stats` with the correct `postId` and `userId`

#### Scenario: Count derived from events

- **WHEN** `GET /api/v1/posts` or `GET /api/v1/posts/:slug` returns a post
- **THEN** `downloadCount` in the response is `SELECT COUNT(*) FROM post_stats WHERE postId = ?`
