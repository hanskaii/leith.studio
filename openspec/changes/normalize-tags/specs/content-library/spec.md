## ADDED Requirements

### Requirement: Tags as a normalized relation

Tags MUST be stored in a dedicated `tags` table joined to `posts` via a `post_tags` junction. The `tags` table MUST have a unique URL-safe `slug` column distinct from a human-readable `name`. The junction MUST use a composite primary key `(postId, tagId)` so the same tag cannot be linked to the same post more than once.

#### Scenario: Tags table schema

- **WHEN** the `tags` table is queried
- **THEN** each row has `id` (text PK), `slug` (text, unique), `name` (text), `createdAt` (timestamp)
- **AND** the slug is lowercase, hyphen-separated, alphanumeric

#### Scenario: post_tags junction

- **WHEN** a post has multiple tags
- **THEN** one `post_tags` row exists per (post, tag) pair
- **AND** deleting a post cascades to delete its `post_tags` rows (ON DELETE CASCADE)
- **AND** deleting a tag cascades to delete the linking rows (ON DELETE CASCADE) but leaves orphan posts intact

#### Scenario: Slug uniqueness

- **WHEN** a tag insert is attempted with a slug that already exists
- **THEN** the database UNIQUE constraint causes the insert to fail
- **AND** the workflow uses `ON CONFLICT (slug) DO NOTHING` to make the operation idempotent

---

### Requirement: Tag list endpoint

`GET /api/v1/tags` MUST return all tags that have at least one ready and published post, with each tag's post count. Results MUST be ordered by post count descending, then alphabetically by name.

#### Scenario: Returns tags with counts

- **WHEN** a client calls `GET /api/v1/tags`
- **THEN** the response is `{ data: { slug, name, postCount }[] }`
- **AND** every returned tag's `postCount >= 1`

#### Scenario: Excludes tags with no live posts

- **WHEN** a tag exists in the `tags` table but all linked posts are drafts or have `processingStatus != 'ready'`
- **THEN** that tag is NOT included in the response

#### Scenario: Sort order

- **WHEN** two tags have different post counts
- **THEN** the higher-count tag appears first
- **AND** when two tags have equal counts, the alphabetically earlier name appears first

## MODIFIED Requirements

### Requirement: Post entity schema

The `posts` table MUST NOT have a `tags` column. Tags are accessed exclusively through the `post_tags` junction.

The full `posts` column set after this change: `id`, `slug`, `title`, `body`, `coverImage`, `coverThumb`, `status`, `publishedAt`, `createdAt`, `updatedAt`. The `tags` JSON column previously present is REMOVED.

#### Scenario: Post insert without tags column

- **WHEN** a row is inserted into `posts`
- **THEN** no `tags` field is provided
- **AND** the insert succeeds without referencing the removed column

#### Scenario: Drizzle relations expose tags

- **WHEN** code reads `posts` via Drizzle relational queries with `with: { postTags: { with: { tag: true } } }`
- **THEN** each post returns an array of `postTags` entries, each containing the joined `tag` row

---

### Requirement: Feed list API joins post_tags

`GET /api/v1/posts` SHALL aggregate each post's tags via `LEFT JOIN post_tags LEFT JOIN tags` and return `tags: { slug, name }[]` per item. When the `?tag=<slug>` query parameter is set, the SQL query MUST constrain results to posts that are linked to a tag with the matching slug. Filtering MUST happen in SQL, not in application code after the rows are fetched.

#### Scenario: Feed includes tags array per post

- **WHEN** a member calls `GET /api/v1/posts`
- **THEN** each item in `data.items` has `tags: { slug, name }[]`
- **AND** posts with no tags have `tags: []`
- **AND** posts with multiple tags have multiple entries in the array

#### Scenario: Tag filter constrains result set in SQL

- **WHEN** a member calls `GET /api/v1/posts?tag=cinematic-loop`
- **THEN** only posts with at least one tag whose slug equals `"cinematic-loop"` are returned
- **AND** the `total` field reflects the filtered count, not the unfiltered library size
- **AND** pagination math (`page`, `pageSize`) is computed against the filtered set

#### Scenario: Tag filter is case-sensitive on slug

- **WHEN** `?tag=Cinematic-Loop` is requested
- **THEN** no results are returned because slugs are lowercase by construction
- **AND** the client is expected to URL-encode lowercase slugs

---

### Requirement: Single post API includes tags

`GET /api/v1/posts/:slug` SHALL return `tags: { slug, name }[]` in the response, joined from `post_tags` + `tags`. The order of tags in the array reflects insertion order.

#### Scenario: Post detail includes tags

- **WHEN** a member calls `GET /api/v1/posts/:slug` for a tagged post
- **THEN** the response includes `tags: { slug, name }[]` with at least one entry
- **AND** the `slug` value matches what a `?tag=<slug>` filter on the feed would accept

---

### Requirement: Feed page filters tags via URL

The web feed page MUST source the tag pill bar from `GET /api/v1/tags`, not from the loaded posts. Clicking a tag pill MUST update the URL to `?tag=<slug>` and trigger a new server query — tag filtering MUST NOT happen in client-side JavaScript after the posts are loaded.

#### Scenario: Tag pills source from /api/v1/tags

- **WHEN** the feed page mounts
- **THEN** the pill bar fetches `GET /api/v1/tags` and renders one pill per returned tag
- **AND** pill labels show the tag's `name` (display string)
- **AND** pill values reference the tag's `slug` (URL string)

#### Scenario: Selecting a tag updates the URL

- **WHEN** a user clicks a tag pill
- **THEN** the URL gains `?tag=<slug>` (or replaces the existing `tag` parameter)
- **AND** the page issues a new `GET /api/v1/posts?tag=<slug>` query
- **AND** the grid re-renders with the server-filtered results

#### Scenario: Deselecting a tag

- **WHEN** the currently-active tag pill is clicked again, or the "All" pill is clicked
- **THEN** the `?tag` parameter is removed from the URL
- **AND** the page issues a `GET /api/v1/posts` query without a tag filter

#### Scenario: Empty result state shows tag name

- **WHEN** `?tag=<slug>` returns zero posts
- **THEN** the empty-state message references the tag's display `name`, not its slug

---

### Requirement: Post detail page uses primary tag

The post detail page (`/feed/:slug`) MUST display the post's first tag (by insertion order in `post_tags`) in the breadcrumb and tag chip. The "Related posts" section MUST find related posts by matching the primary tag's slug, not by string equality on a flat tag name.

#### Scenario: Breadcrumb shows tag name

- **WHEN** a post detail page renders
- **AND** the post has at least one tag
- **THEN** the breadcrumb shows the first tag's `name`
- **AND** the tag chip on the page shows the same `name`

#### Scenario: Post with no tags

- **WHEN** a post has zero tags
- **THEN** the breadcrumb shows an empty segment or omits the tag entirely
- **AND** the tag chip is not rendered
- **AND** the related-posts section is not rendered

#### Scenario: Related posts share primary tag

- **WHEN** the related-posts query runs
- **THEN** posts whose `tags` array contains an entry with `slug === primaryTag.slug` are listed first
- **AND** other posts fill the remainder up to 3 items total
