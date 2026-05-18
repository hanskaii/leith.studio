## ADDED Requirements

### Requirement: Creator dashboard lists all posts with status

The system SHALL expose `GET /api/v1/creator/posts` (auth required, `content:manage`) returning all posts (published + draft) ordered by `createdAt` descending, including `id`, `slug`, `title`, `status`, `publishedAt`, `createdAt`. The `/creator` web route renders this list in a table with status badges and action buttons.

#### Scenario: Admin fetches all posts

- **WHEN** an `admin` calls `GET /api/v1/creator/posts`
- **THEN** all posts regardless of status are returned

#### Scenario: Non-admin is rejected

- **WHEN** a `member` or `user` calls `GET /api/v1/creator/posts`
- **THEN** the Gate policy denies and returns 403

#### Scenario: Dashboard table shows posts

- **WHEN** the creator dashboard loads
- **THEN** a table renders with columns: Title, Status (badge), Published At, Actions (Edit / Publish / Unpublish / Delete)

### Requirement: Creator can create a new draft post

The system SHALL expose `POST /api/v1/creator/posts` (auth required, `content:manage`) accepting `{ title, body, coverImage?, tags? }` and creating a post with `status = "draft"`. The slug is auto-generated from the title (kebab-case, uniqueness enforced with suffix if collision).

#### Scenario: Successful draft creation

- **WHEN** an admin posts `{ title: "My Post", body: "..." }` to `/api/v1/creator/posts`
- **THEN** a new post with `status = "draft"` is created and returned with generated slug

#### Scenario: Title collision generates unique slug

- **WHEN** a post with slug `my-post` already exists and a new post with title "My Post" is created
- **THEN** the new post receives slug `my-post-2`

#### Scenario: Missing required fields

- **WHEN** `title` or `body` is absent
- **THEN** `zValidator` returns a 400 validation error

### Requirement: Creator can edit an existing post

The system SHALL expose `PATCH /api/v1/creator/posts/:id` (auth required, `content:manage`) accepting partial updates `{ title?, body?, coverImage?, tags?, status? }`. Slug is NOT updatable after first publish. Changing `status` to `"published"` sets `publishedAt` if not already set.

#### Scenario: Edit draft post fields

- **WHEN** an admin patches `{ title: "Updated Title" }` on a draft post
- **THEN** the post title is updated and slug is regenerated (draft only)

#### Scenario: Publish sets publishedAt

- **WHEN** an admin patches `{ status: "published" }` on a draft post
- **THEN** `publishedAt` is set to the current timestamp and the post becomes visible in the member feed

#### Scenario: Slug cannot be changed after publish

- **WHEN** an admin attempts to update the title of a `published` post
- **THEN** the title updates but the slug remains unchanged

#### Scenario: Unpublish hides post from feed

- **WHEN** an admin patches `{ status: "draft" }` on a published post
- **THEN** `GET /api/v1/posts` no longer returns this post and direct slug access returns 404

### Requirement: Creator can delete a draft post

The system SHALL expose `DELETE /api/v1/creator/posts/:id` (auth required, `content:manage`) that permanently deletes a post. Only posts with `status = "draft"` can be deleted; published posts must be unpublished first.

#### Scenario: Delete draft post

- **WHEN** an admin deletes a draft post
- **THEN** the post is permanently removed and the API returns `200 { success: true, message: "Post deleted" }`

#### Scenario: Attempt to delete published post

- **WHEN** an admin attempts to delete a `published` post
- **THEN** the API returns `409 { success: false, message: "Unpublish the post before deleting." }`

### Requirement: Creator can upload cover images to R2

The system SHALL expose `POST /api/v1/creator/upload` (auth required, `content:manage`) accepting a `multipart/form-data` request with a single image file. The file is stored in R2 and the public URL is returned.

#### Scenario: Successful image upload

- **WHEN** an admin uploads a valid JPEG or PNG under 5MB
- **THEN** the file is stored in R2 and the response returns `{ url: "https://..." }`

#### Scenario: File too large

- **WHEN** the uploaded file exceeds 5MB
- **THEN** the API returns `400 { success: false, message: "File must be under 5MB." }`

#### Scenario: Unsupported file type

- **WHEN** the uploaded file is not JPEG, PNG, or WebP
- **THEN** the API returns `400 { success: false, message: "Only JPEG, PNG, and WebP images are supported." }`

### Requirement: Creator post editor UI

The `/creator` and `/creator/$id` web routes SHALL provide a split-pane editor: left pane has form fields (title, tags, cover image upload), right pane shows a live Markdown preview of the body. The editor uses `useForm` + `useMutation` following the standard form pattern.

#### Scenario: Live preview updates on input

- **WHEN** the creator types in the body textarea
- **THEN** the right pane preview re-renders the Markdown in real-time (debounced 300ms)

#### Scenario: Cover image upload shows preview

- **WHEN** the creator selects and uploads an image
- **THEN** the uploaded image URL populates the cover image field and a thumbnail preview renders in the form
