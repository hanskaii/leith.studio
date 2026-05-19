## ADDED Requirements

### Requirement: Cover image upload generates WebP thumbnail

On every cover image upload via `POST /api/v1/creator/upload`, the upload service SHALL generate a WebP thumbnail alongside the original. The thumbnail SHALL be resized to a maximum width of 800px (preserving aspect ratio) at 80% quality, encoded as WebP, and stored in R2 at key `images/{userId}/{uuid}-thumb.webp`. The original is stored unchanged at its existing path. The response SHALL return `{ url: string, thumbUrl: string }` instead of `{ url: string }`.

#### Scenario: Successful cover image upload returns both URLs

- **WHEN** a creator uploads a valid cover image (JPEG, PNG, WebP ≤ 2MB)
- **THEN** the API returns `{ url: "<original R2 URL>", thumbUrl: "<thumb R2 URL>" }` where `thumbUrl` points to a WebP file ≤ 800px wide

#### Scenario: Thumbnail stored at -thumb.webp key

- **WHEN** a cover image is uploaded with UUID `abc123` for user `user-1`
- **THEN** the thumbnail is stored in R2 under key `images/user-1/abc123-thumb.webp`

#### Scenario: Original untouched

- **WHEN** a 4MB JPEG is uploaded as a cover image
- **THEN** the original is stored unchanged; only the thumbnail variant is encoded as WebP at reduced resolution

---

### Requirement: Avatar upload generates 256×256 WebP thumbnail

On every avatar upload via `POST /api/v1/creator/upload` (avatar type), the upload service SHALL generate a 256×256 WebP thumbnail using a center-crop strategy. The thumbnail SHALL replace the need to serve the full-resolution avatar in `<Avatar>` components. The response SHALL return `{ url: string, thumbUrl: string }`.

#### Scenario: Avatar thumbnail is square

- **WHEN** a creator uploads an avatar image
- **THEN** the thumbnail is exactly 256×256 pixels, WebP-encoded, center-cropped from the original

#### Scenario: Avatar upload response

- **WHEN** a creator uploads an avatar
- **THEN** the API returns `{ url: "<original>", thumbUrl: "<256x256 thumb>" }`

---

### Requirement: WASM thumbnail generation via @cf-wasm/photon

The thumbnail generation SHALL use `@cf-wasm/photon` for WASM-based image processing within the Cloudflare Worker. No external service calls SHALL be made during thumbnail generation. The processing SHALL complete within the Cloudflare Workers CPU budget for files up to 2MB.

#### Scenario: Thumbnail generated in-Worker

- **WHEN** a cover image is uploaded
- **THEN** the thumbnail is generated synchronously within the same Worker invocation with no outbound HTTP requests for image processing

#### Scenario: File size limit enforced before processing

- **WHEN** a file exceeding 2MB is submitted to the cover image upload endpoint
- **THEN** the API returns 400 before any WASM processing occurs
