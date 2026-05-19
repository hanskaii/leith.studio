## ADDED Requirements

### Requirement: Landing sections display real published posts

Each content section on the landing page SHALL fetch published posts filtered by the section's tag using the public posts API. Sections SHALL display up to 6 posts in a 3-column grid.

#### Scenario: Section renders fetched posts

- **WHEN** published posts with the matching tag exist
- **THEN** the section renders up to 6 post preview cards in a 3×2 grid
- **THEN** each card shows the post cover thumbnail (`coverThumb ?? coverImage`)

#### Scenario: Section hides when no posts match the tag

- **WHEN** zero published posts exist with the section's tag
- **THEN** the section is not rendered (null)

#### Scenario: Section renders fewer than 6 cards when fewer posts exist

- **WHEN** between 1 and 5 published posts match the tag
- **THEN** the section renders only those posts; no placeholder cards are shown

### Requirement: Post preview card shows thumbnail with lock overlay for premium content

Each post preview card SHALL render the post's `coverThumb ?? coverImage` as a static image in a `14/9` aspect ratio container. When the post `access` is `"premium"` and the viewer is not a member or admin, the thumbnail SHALL show a semi-transparent overlay with a lock icon. When `access` is `"free"`, no overlay is shown.

#### Scenario: Premium card shows lock overlay for unauthenticated visitor

- **WHEN** a post has `access === "premium"` and the viewer has no session or role `"user"`
- **THEN** a lock overlay is rendered over the thumbnail
- **THEN** clicking the card navigates to the checkout URL

#### Scenario: Premium card unlocked for member

- **WHEN** a post has `access === "premium"` and the viewer has role `"member"` or `"admin"`
- **THEN** no lock overlay is rendered
- **THEN** clicking the card navigates to `/feed/$slug`

#### Scenario: Free card always shown without lock

- **WHEN** a post has `access === "free"`
- **THEN** no lock overlay is rendered regardless of session state
- **THEN** clicking the card navigates to `/feed/$slug`

### Requirement: Post preview card shows title and reference code

Each card SHALL display the post title below the thumbnail. Below the title, the card SHALL display a reference label formatted as `@` followed by the first 8 characters of the post slug, rendered in a muted small monospace-style font.

#### Scenario: Card shows title and slug reference

- **WHEN** a post preview card renders
- **THEN** the post title is visible below the thumbnail
- **THEN** a label in the format `@<first-8-chars-of-slug>` is shown beneath the title

### Requirement: Post preview card shows format badge when present

When a post has a non-null `format` field, the card SHALL show a small format badge (e.g. "MP4", "PNG") in uppercase.

#### Scenario: Card with video format shows badge

- **WHEN** a post has `format === "mp4"` or `format === "webm"`
- **THEN** the card shows a small uppercase "MP4" or "WEBM" badge

#### Scenario: Card without format shows no badge

- **WHEN** a post has no `format` metadata
- **THEN** no badge is rendered

### Requirement: Content section shows Suspense skeleton while loading

While the post data is fetching, each content section SHALL render a 3×2 grid of skeleton placeholder cards in the same dimensions as real cards.

#### Scenario: Section skeleton shown during data fetch

- **WHEN** the section's post query is pending
- **THEN** a skeleton grid of 6 placeholder cards is shown in place of the real grid
