## MODIFIED Requirements

### Requirement: PostCard displays cover media

PostCard SHALL render a media preview in a `14/9` aspect ratio container. The media type SHALL be determined by the post's `format` field:

- If `format` is `"mp4"` or `"webm"` and `fileUrl` is present: render a static `<img>` using `coverThumb ?? coverImage` by default; on pointer enter, replace with a `<video autoPlay muted loop playsInline>` using `fileUrl`; on pointer leave, revert to the static image.
- Otherwise: render a static `<img>` using `coverThumb ?? coverImage`. No hover interaction.

If neither `coverThumb` nor `coverImage` is set, the media container SHALL not be rendered.

#### Scenario: Image post card shows static cover

- **WHEN** a PostCard renders a post with no video format
- **THEN** the card shows `coverThumb ?? coverImage` as a static image
- **THEN** no video element is mounted on any pointer event

#### Scenario: Video post card shows static thumb then plays on hover

- **WHEN** a PostCard renders a post with `format` mp4 or webm and a valid `fileUrl`
- **THEN** the card initially shows `coverThumb ?? coverImage`
- **THEN** on pointer enter the static image is replaced with a looping video
- **THEN** on pointer leave the video is removed and the static image returns

#### Scenario: Video post with missing coverThumb falls back to coverImage

- **WHEN** a PostCard renders a video post where `coverThumb` is null and `coverImage` is set
- **THEN** `coverImage` is used as the static thumbnail source
