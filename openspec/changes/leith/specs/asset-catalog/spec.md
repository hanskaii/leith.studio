## ADDED Requirements

### Requirement: Three-table schema for posts, metadata, and download events

Asset metadata SHALL live in a separate `post_metadata` table (one-to-one with `posts`). Download events SHALL live in `post_stats` (one-to-many).

**`post_metadata` columns**: `postId` (text, PK and FK → posts.id), `format` (text, not null: `"mp4"` | `"png"` | `"jpg"` | `"webm"`), `resolution` (text, not null), `duration` (integer seconds, nullable — null for image assets), `isLoop` (integer 0/1, not null, default 0), `fileKey` (text, not null — R2 key, never returned to clients), `fileSize` (integer, not null), `access` (text, not null, default `"premium"`: `"free"` | `"premium"`).

Every published post MUST have a corresponding `post_metadata` row. There is no concept of a post without a file on Leith.

**`post_stats` columns**: `id` (cuid PK), `postId` (FK → posts.id), `userId` (FK → users.id), `downloadedAt` (integer timestamp). Index on `postId`.

`posts` table itself SHALL NOT contain any asset or download fields.

#### Scenario: Post is always an asset

- **WHEN** a post is published
- **THEN** a `post_metadata` row with a valid `fileKey` MUST exist; publishing SHALL be blocked if `post_metadata` row is absent

#### Scenario: Creator saves post with asset

- **WHEN** a creator uploads a file and saves the post
- **THEN** a `post_metadata` row is upserted with `postId`, `fileKey`, `format`, `resolution`, `fileSize`, `isLoop`, `duration`, `access`

---

### Requirement: Feed cards show asset type badges

Post cards on the feed (`/feed`) SHALL display format and resolution as compact badges when `format` is not null.

#### Scenario: Asset post in feed

- **WHEN** a post with `format = "mp4"` and `resolution = "1920×1080"` appears in the feed
- **THEN** the card shows badges: `MP4` and `1920×1080`

#### Scenario: Text-only post in feed

- **WHEN** a post with `fileKey = null` appears in the feed
- **THEN** no format/resolution badges are shown

---

### Requirement: Post detail shows asset specifications

The post detail page (`/feed/$slug`) SHALL display an asset spec table when the post has a `fileKey`. Spec table includes: Format, Resolution, Duration (if video), Loop (if `isLoop = true`), File size, Access tier.

#### Scenario: Video asset detail

- **WHEN** a user opens a post with `format = "mp4"`, `duration = 30`, `isLoop = true`, `fileSize = 52428800`
- **THEN** the spec table shows: Format MP4, Resolution, Duration 0:30, Loop Seamless, Access (Free or Premium badge)

#### Scenario: Image asset detail

- **WHEN** a user opens a post with `format = "png"`, `duration = null`
- **THEN** the spec table shows Format, Resolution, Access — Duration and Loop rows are omitted

---

### Requirement: Download button on post detail

The post detail page SHALL show a Download button when `fileKey` is not null. The button state depends on the user's access level:

- User not logged in: button links to `/login`
- User logged in, asset is `free`: active download button
- User logged in, asset is `premium`, user is `member`/`admin`: active download button
- User logged in, asset is `premium`, user is `user`: button disabled or replaced with "Get All Access" CTA

#### Scenario: Member downloads premium asset

- **WHEN** a member views a premium asset post
- **THEN** a Download button is visible and active; clicking triggers `downloadAssetFn`

#### Scenario: Free user sees premium gate

- **WHEN** a `user`-role user views a premium asset post
- **THEN** a "Get All Access" CTA replaces the download button, linking to the checkout URL
