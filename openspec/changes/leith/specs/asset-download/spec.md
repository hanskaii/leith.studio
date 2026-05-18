## ADDED Requirements

### Requirement: Authenticated download gate

A user MUST be authenticated to download any asset. Anonymous users SHALL be redirected to `/login`. Downloads SHALL be blocked at the API layer via `authMiddleware` before any Gate check runs.

#### Scenario: Anonymous user attempts download

- **WHEN** an unauthenticated request hits `GET /api/v1/posts/:slug/download`
- **THEN** the API returns 401 Unauthorized

#### Scenario: Logged-in user downloads a free asset

- **WHEN** a user with role `user` requests a post where `access = "free"` and `fileKey` is set
- **THEN** the API streams the file with correct `Content-Type` and `Content-Disposition: attachment` headers

#### Scenario: Logged-in user attempts premium asset without pass

- **WHEN** a user with role `user` requests a post where `access = "premium"`
- **THEN** the API returns 403 with `code: "ACCESS_REQUIRED"` and message `"All Access pass required."`

#### Scenario: Member downloads a premium asset

- **WHEN** a user with role `member` requests a post where `access = "premium"` and `fileKey` is set
- **THEN** the API streams the file successfully

---

### Requirement: R2 proxy — no key exposure

The download endpoint SHALL fetch the file from R2 using the `STORAGE` binding and stream it directly to the client. The `fileKey` (R2 object key) MUST NOT appear in any API response body, URL, or header sent to the client.

#### Scenario: File streamed without buffering

- **WHEN** the handler retrieves `STORAGE.get(fileKey)`
- **THEN** the response body is piped as a `ReadableStream` — it SHALL NOT be read into an `ArrayBuffer` first

#### Scenario: File not found in R2

- **WHEN** `STORAGE.get(fileKey)` returns `null` (file missing from bucket)
- **THEN** the API returns 404 with message `"Asset file not found."`

---

### Requirement: Missing post_metadata row

If a post has no `post_metadata` row (data inconsistency), the download endpoint SHALL return 404.

#### Scenario: Metadata row missing

- **WHEN** a request hits `GET /api/v1/posts/:slug/download` and no `post_metadata` row exists for that post
- **THEN** the API returns 404 with message `"Asset file not found."`

---

### Requirement: Download event recorded in post_stats

Every successful file stream SHALL insert a row into `post_stats` (`id`, `postId`, `userId`, `downloadedAt`). The insert SHALL be fire-and-forget — it MUST NOT block or delay the streaming response.

#### Scenario: Download event persisted

- **WHEN** a file is successfully streamed to a user
- **THEN** a new row is inserted into `post_stats` with the correct `postId` and `userId`

#### Scenario: Count derived from events

- **WHEN** `GET /api/v1/posts` or `GET /api/v1/posts/:slug` returns a post
- **THEN** `downloadCount` in the response is `SELECT COUNT(*) FROM post_stats WHERE postId = ?`

---

### Requirement: Web download function

The web layer SHALL expose a `downloadAssetFn` server function that calls the download endpoint via `fetchApiWithAuth` and returns the raw `Response` for the browser to receive as a file download.

#### Scenario: Download button triggers file save

- **WHEN** a user clicks the Download button on a post detail page
- **THEN** `downloadAssetFn` is called, the browser receives the streamed file, and the browser's native save dialog or auto-download triggers
