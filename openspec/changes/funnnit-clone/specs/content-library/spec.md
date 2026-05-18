## ADDED Requirements

### Requirement: Member feed lists published posts with pagination

The system SHALL expose `GET /api/v1/posts?page=1&limit=12&tag=<tag>` (auth required, `content:read` permission) returning a paginated list of published posts ordered by `publishedAt` descending. Each post item includes: `id`, `slug`, `title`, `coverImage`, `tags`, `publishedAt`, `excerpt` (first 160 chars of body).

#### Scenario: Member fetches first page

- **WHEN** a `member` calls `GET /api/v1/posts?page=1&limit=12`
- **THEN** the response returns `{ data: Post[], meta: { page, limit, total, totalPages } }` with up to 12 published posts

#### Scenario: Tag filter applied

- **WHEN** a `member` calls `GET /api/v1/posts?tag=ai-tools`
- **THEN** only published posts with the `ai-tools` tag are returned

#### Scenario: Non-member is rejected

- **WHEN** a `user` without `content:read` calls `GET /api/v1/posts`
- **THEN** the Gate policy returns a 403 response

#### Scenario: Empty feed

- **WHEN** no published posts exist
- **THEN** the endpoint returns `{ data: [], meta: { page: 1, limit: 12, total: 0, totalPages: 0 } }`

### Requirement: Feed UI renders post cards with skeleton loading

The `/feed` route SHALL render a paginated grid of post cards. Each card shows the cover image, title, tags, and published date. While loading, `<Skeleton>` placeholders are shown using `<Suspense>`. Pagination controls appear at the bottom.

#### Scenario: Feed renders loaded state

- **WHEN** `useSuspenseQuery` resolves with posts
- **THEN** post cards render with cover image, title, tag badges, and relative date

#### Scenario: Feed renders loading state

- **WHEN** the query is pending (Suspense boundary)
- **THEN** a grid of `<Skeleton>` cards matching the post card dimensions is shown

#### Scenario: Feed renders empty state

- **WHEN** the query returns zero posts
- **THEN** an `<Empty>` component renders with message "No posts yet. Check back soon."

#### Scenario: Pagination navigates pages

- **WHEN** the user clicks "Next" or a page number
- **THEN** the URL search param `?page=N` updates and `useSuspenseQuery` re-fetches

### Requirement: Individual post page renders full post content

The system SHALL expose `GET /api/v1/posts/:slug` (auth required, `content:read`) returning a single published post with full `body`. The `/posts/$slug` web route renders the post title, cover image, tags, published date, and body (Markdown rendered via `react-markdown` with `rehype-sanitize`).

#### Scenario: Member fetches existing post

- **WHEN** a `member` calls `GET /api/v1/posts/my-post-slug`
- **THEN** the response includes all post fields including `body`

#### Scenario: Slug not found

- **WHEN** the requested slug does not exist or is unpublished
- **THEN** the API returns `404 { success: false, message: "Post not found" }`

#### Scenario: Post body renders safely

- **WHEN** the post body contains Markdown with potentially unsafe HTML
- **THEN** `rehype-sanitize` strips disallowed tags before rendering

#### Scenario: Back navigation from post

- **WHEN** a member is on a post page and clicks "Back to feed"
- **THEN** TanStack Router navigates to `/feed` preserving the previous page/tag filter state

### Requirement: Public stats endpoint

The system SHALL expose `GET /api/v1/posts/stats` (no auth required) returning `{ postCount: number, memberCount: number }` for display on the landing page.

#### Scenario: Stats return correct counts

- **WHEN** `/api/v1/posts/stats` is called
- **THEN** `postCount` equals the count of posts with `status = "published"` and `memberCount` equals the count of users with `role = "member"` or `role = "admin"`
