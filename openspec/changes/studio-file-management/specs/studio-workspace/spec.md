## ADDED Requirements

### Requirement: Studio grid is the default view at /studio

`/studio` SHALL render a card grid of the current creator's posts (their own posts only), sorted by `createdAt` descending. Each card SHALL display the cover thumbnail, title (or "Untitled" placeholder), and a status badge.

#### Scenario: Creator opens /studio

- **WHEN** an authenticated creator navigates to `/studio`
- **THEN** a grid of their posts is rendered, most-recent first

#### Scenario: New creator with no posts

- **WHEN** a creator with zero posts opens `/studio`
- **THEN** an empty state is shown with a prominent upload zone and a "Drop files to begin" message

---

### Requirement: Multi-file upload via drop zone or click

The grid SHALL include an upload zone that accepts multiple files at once via drag-and-drop or a browse dialog. Each file SHALL produce a card in the grid immediately with a loading indicator until R2 confirms storage.

#### Scenario: Drop 5 files at once

- **WHEN** a creator drops 5 files into the upload zone
- **THEN** 5 cards appear in the grid, each with a per-card loading state; cards transition to the AI-processing badge once R2 confirms storage

#### Scenario: Unsupported file type rejected per-file

- **WHEN** one file in a batch has an unsupported extension
- **THEN** only that card shows a failed state with an error message; the other files upload normally

---

### Requirement: Card status badge reflects post state

Each card SHALL show one of the following badges, derived from post fields:

- `failed` — `mediaStatus = "failed"`
- `processing AI` — `enrichmentStatus = "processing"`
- `draft` — `status = "draft"` and not in the above states
- `published` — `status = "published"`

#### Scenario: Card transitions through states

- **WHEN** a file is dropped
- **THEN** the badge starts as a loading spinner (upload in progress) → transitions to `processing AI` once R2 stores the file and enrichment starts → transitions to `draft` once enrichment completes → transitions to `published` when the creator publishes

---

### Requirement: Click card to open right-side edit drawer

Clicking a card SHALL open a right-side slide-in drawer with the post's editable fields: title, description (body), tags, access tier, cover image. The grid SHALL remain visible behind the drawer. The URL SHALL reflect the selected post via a search param so the drawer state survives refresh.

#### Scenario: Open drawer

- **WHEN** a creator clicks a card
- **THEN** the right drawer slides in showing the post's editable fields; URL gains `?selected={postId}`

#### Scenario: Close drawer

- **WHEN** a creator clicks the drawer's close button or clicks outside the drawer
- **THEN** the drawer slides out; the `?selected` search param is removed

#### Scenario: Refresh with drawer open

- **WHEN** a creator refreshes the page while a drawer is open
- **THEN** the drawer reopens automatically for the same post

---

### Requirement: Drawer saves edits to the post

The drawer SHALL persist edits via `PATCH /api/v1/creator/posts/:id`. Saves SHALL trigger on field blur for text fields and immediately for toggles/selects. Errors SHALL surface as inline toast messages.

#### Scenario: Edit title and blur

- **WHEN** a creator changes the title field in the drawer and tabs away
- **THEN** a `PATCH` request fires with the new title; on success the card title updates; on failure a toast appears

---

### Requirement: Multi-select and batch publish

Each card SHALL have a checkbox. When 1 or more cards are selected, an action bar SHALL appear at the top of the grid with a "Publish selected" button. Clicking it SHALL flip every selected `draft` post to `published` via parallel PATCH calls.

#### Scenario: Select 3 drafts and publish

- **WHEN** a creator selects 3 cards (all in `draft` state) and clicks "Publish selected"
- **THEN** 3 parallel PATCH requests are sent; on success all 3 cards show the `published` badge; selection clears

#### Scenario: Cannot publish non-drafts

- **WHEN** a creator selects a mix of `draft`, `published`, and `processing AI` cards
- **THEN** the "Publish selected" button is enabled but only `draft` cards are PATCHed; the action bar surfaces a summary message ("2 of 5 published, 3 skipped")
