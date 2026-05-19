## ADDED Requirements

### Requirement: Detail page shows video player for video posts

The post detail page (`PostContent`) SHALL render a `<video>` element instead of a `<img>` when the post has `format` equal to `"mp4"` or `"webm"` and a non-null `fileUrl`. The video element SHALL have `autoPlay`, `muted`, `loop`, `playsInline`, and `controls` attributes. The cover image is not shown when a video player is present.

#### Scenario: Detail page renders video player for video post

- **WHEN** a post detail page loads with `format` equal to `"mp4"` or `"webm"` and a valid `fileUrl`
- **THEN** a `<video>` element is rendered with `autoPlay muted loop playsInline controls`
- **THEN** the video src is set to `post.fileUrl`
- **THEN** no `<img>` cover image is rendered above the post body

#### Scenario: Detail page renders cover image for image post

- **WHEN** a post detail page loads with `format` equal to `"png"` or `"jpg"` or no format
- **THEN** an `<img>` element is rendered using `post.coverImage`
- **THEN** no `<video>` element is rendered

#### Scenario: Detail page renders cover image when fileUrl is absent

- **WHEN** a post has a video format but `fileUrl` is null or undefined
- **THEN** the existing `<img>` cover image is rendered as a fallback

### Requirement: Feed API exposes asset URL for video-capable rendering

The `GET /posts` listing and `GET /posts/:slug` single-post endpoints SHALL include a `fileUrl` field in their response. For posts with a `fileKey`, `fileUrl` SHALL be constructed as `${origin}/api/files/${fileKey}`. For posts without a `fileKey`, `fileUrl` SHALL be `null`.

#### Scenario: Feed listing includes fileUrl for video posts

- **WHEN** `GET /api/v1/posts` is called
- **THEN** each post object in `items` contains a `fileUrl` field
- **THEN** posts with a `fileKey` have `fileUrl` set to the full `/api/files/` URL
- **THEN** posts without a `fileKey` have `fileUrl` set to `null`

#### Scenario: Single post includes fileUrl

- **WHEN** `GET /api/v1/posts/:slug` is called for a video post
- **THEN** the response includes `fileUrl` with the full asset URL
