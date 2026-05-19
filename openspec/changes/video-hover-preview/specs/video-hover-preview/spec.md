## ADDED Requirements

### Requirement: Feed card shows static thumbnail for image posts

PostCard SHALL display `coverThumb ?? coverImage` as a static `<img>` for posts whose `format` is not a video type (mp4 or webm), with no hover interaction change.

#### Scenario: Image post card renders static image

- **WHEN** a post card is rendered with `format` equal to `"png"` or `"jpg"` or no format
- **THEN** the card displays the cover image
- **THEN** no video element is mounted on hover

### Requirement: Feed card plays looping video on hover for video posts

PostCard SHALL detect when `format` is `"mp4"` or `"webm"` and the post has a `fileUrl`. On pointer enter, the card SHALL mount a `<video>` element with `autoPlay`, `muted`, `loop`, and `playsInline` attributes, using `fileUrl` as the source. On pointer leave, the card SHALL unmount the video element and show the static thumbnail again.

#### Scenario: Hovering a video post card starts playback

- **WHEN** the user moves the pointer over a PostCard with a video format post
- **THEN** a `<video>` element is mounted with `autoPlay muted loop playsInline`
- **THEN** the video src is set to `post.fileUrl`
- **THEN** the static thumbnail image is hidden

#### Scenario: Leaving a video post card stops playback

- **WHEN** the user moves the pointer away from a video PostCard
- **THEN** the `<video>` element is unmounted
- **THEN** the static thumbnail image is shown again

#### Scenario: Video post with no fileUrl falls back to static thumbnail

- **WHEN** a post has a video format but `fileUrl` is null or undefined
- **THEN** the card renders only the static thumbnail with no hover interaction
