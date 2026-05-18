## MODIFIED Requirements

### Requirement: Creator post editor requires asset fields

The creator post editor (`/creator/$id`) SHALL include form fields for all asset metadata: `format` (select), `resolution` (text input), `duration` (number input, seconds — optional, for video), `isLoop` (checkbox/toggle), `access` (toggle: `"free"` | `"premium"`). The asset file upload zone is required — a post cannot be published without a `fileKey`.

#### Scenario: Editor shows asset section

- **WHEN** a creator opens the post editor
- **THEN** an "Asset" section is visible with file upload zone, format, resolution, duration, isLoop, and access fields

#### Scenario: Publish blocked without file

- **WHEN** a creator attempts to publish a post without uploading a file
- **THEN** the Publish button is disabled and an inline message reads "Upload an asset file before publishing"

---

### Requirement: Creator can upload asset file

The creator upload flow SHALL accept an asset file (MP4, PNG, JPG, WebP up to 200MB) via `POST /api/v1/creator/upload`. The response returns `{ url: string, key: string }` — the `key` is stored as `fileKey` in the post. The `url` is used only for display confirmation; it MUST NOT be stored or sent to the client after the editor session.

#### Scenario: Valid asset upload

- **WHEN** a creator uploads an MP4 file ≤ 200MB
- **THEN** the file is stored in R2, the handler returns `{ url, key }`, and the editor stores `key` in the `fileKey` form field

#### Scenario: Oversized file rejected

- **WHEN** a creator uploads a file > 200MB
- **THEN** the API returns 400 with message `"File too large. Maximum size is 200MB."`

#### Scenario: Invalid file type rejected

- **WHEN** a creator uploads a file that is not MP4, PNG, JPG, or WebP
- **THEN** the API returns 400 with message `"Unsupported file type."`

---

### Requirement: Creator API upserts post_metadata

`POST /api/v1/creator/posts` and `PATCH /api/v1/creator/posts/:id` SHALL accept `format`, `resolution`, `duration`, `isLoop`, `fileKey`, `fileSize`, `access` as optional fields. When any of these are present, the handler SHALL upsert a `post_metadata` row (insert or update) using `postId` as the key. When none are present, `post_metadata` is not touched.

#### Scenario: Create post with asset metadata

- **WHEN** a creator submits a new post with `fileKey`, `format: "mp4"`, `resolution: "1920×1080"`, `duration: 30`, `isLoop: true`, `access: "free"`
- **THEN** a `post_metadata` row is inserted with those values; the response includes the metadata fields

#### Scenario: Update access tier only

- **WHEN** a creator patches a post with `{ access: "premium" }`
- **THEN** the `post_metadata` row is updated with `access: "premium"`; the `posts` row is unchanged

#### Scenario: Metadata upserted on every save

- **WHEN** a creator saves a draft with asset fields present
- **THEN** `post_metadata` row is inserted or updated; partial updates (e.g. only `access`) are merged with existing values

---

### Requirement: Upload size limit increased

The existing cover image upload is limited to 5MB. The asset file upload SHALL support up to 200MB. These are separate upload endpoints or the same endpoint with different validation based on an `uploadType` field.

#### Scenario: Cover image still limited to 5MB

- **WHEN** a creator uploads a cover image > 5MB
- **THEN** the API returns 400 — cover image limit is unchanged

#### Scenario: Asset file accepts up to 200MB

- **WHEN** a creator uploads an MP4 of 150MB as an asset file
- **THEN** the upload succeeds
