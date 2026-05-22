## ADDED Requirements

### Requirement: Search index document layer

Every post that is searchable MUST have a corresponding Markdown document in R2 at the key `search/posts/{postId}.md`. The document MUST contain a YAML front matter block with `postId`, `slug`, `type` (`"video" | "image" | "audio"`), `access` (`"free" | "premium"`), `tags` (array of tag slugs), and `publishedAt` (ISO 8601 or `null`). The body MUST contain the post title as an H1, the description, and a comma-separated list of tag names. The application MUST NOT call Cloudflare AI Search's items/upsert API directly — R2 is the source, AI Search consumes via auto-crawl.

#### Scenario: Document is written on post creation

- **WHEN** a post is created via the studio approve workflow or the creator API
- **THEN** an R2 object at `search/posts/{postId}.md` exists containing the document with front matter and body
- **AND** the document's `postId` front matter field equals the post's database id

#### Scenario: Document is overwritten on post update

- **WHEN** a post's title, body, or tag set changes via the creator API
- **THEN** the R2 object at `search/posts/{postId}.md` is overwritten with the new content
- **AND** the previous version is replaced atomically (R2 PUT semantics)

#### Scenario: Document is deleted on post delete

- **WHEN** a post is deleted via the creator API
- **THEN** the R2 object at `search/posts/{postId}.md` is removed via `STORAGE.delete`

#### Scenario: Reindex endpoint rebuilds documents in bulk

- **WHEN** `POST /api/v1/studio/search/reindex` is called by a `content.manage` user
- **THEN** every published post is re-written to its `search/posts/{postId}.md` location
- **AND** the response is `{ indexed: N }` where N is the count of processed posts

---

### Requirement: AI Search query path

`GET /api/v1/posts` MUST branch on the presence of a `?q=` query parameter. When `q` is set, the handler MUST call the AI Search Workers binding to obtain a ranked list of post ids, then SELECT those posts from the database (preserving the existing tag/status/metadata filters), then re-sort the SELECT result by AI Search rank order before returning. When `q` is absent, the handler runs the unchanged SQL path.

#### Scenario: Search returns semantically-ranked results

- **WHEN** a client calls `GET /api/v1/posts?q=moody+rain`
- **THEN** the handler calls `searchPosts(env, { query: "moody rain", max: 50 })`
- **AND** the response `items` are ordered by AI Search relevance, not by `publishedAt`

#### Scenario: Tag filter layered on top of search

- **WHEN** a client calls `GET /api/v1/posts?q=moody+rain&tag=loop`
- **THEN** AI Search returns up to 50 ranked candidate ids
- **AND** the SQL query intersects those ids with posts that have a tag whose slug equals `"loop"`
- **AND** the response includes only posts that satisfy BOTH conditions, ordered by AI Search rank

#### Scenario: Search collapses pagination

- **WHEN** a search query is active
- **THEN** the response sets `page: 1, pageSize: items.length, total: items.length`
- **AND** the client treats the result set as a single non-paginated page

#### Scenario: Empty search result

- **WHEN** AI Search returns zero hits for a query
- **THEN** the response is `{ items: [], total: 0, page: 1, pageSize: 50 }`
- **AND** no database query is issued (early return after the empty hit list)

---

### Requirement: Graceful fallback when AI Search is unavailable

When the AI Search binding is missing, mis-configured, or throws an error, the handler MUST fall back to a SQL `LIKE` search on `posts.title` and `tags.name`. The user MUST receive a result page (degraded quality, not an error). The failure MUST be logged so the operator can diagnose.

#### Scenario: Binding throws — SQL LIKE takes over

- **WHEN** `searchPosts` throws (e.g., binding `AI_SEARCH` is undefined or returns a 500)
- **THEN** the handler catches the error, logs `"[search] AI Search failed, falling back to LIKE"`
- **AND** runs the SQL fallback against `posts.title ILIKE %q%` OR `tags.name ILIKE %q%`
- **AND** returns the fallback results in the same response shape as the AI Search path

#### Scenario: Fallback preserves rank semantics

- **WHEN** the SQL fallback is used
- **THEN** each row receives a synthetic descending score (`50 - rowIndex`)
- **AND** the response order matches the SQL `ORDER BY` (most-recently-published first when otherwise tied)

## MODIFIED Requirements

### Requirement: Feed page filters tags via URL

The web feed page MUST accept a `q` URL parameter (in addition to `tag`, `type`, `sort`, `page` already specified). When `q` is set, the feed MUST issue a server query with the `q` parameter and render the server-ranked results without any client-side text filtering. When `q` is empty/absent, the feed continues to operate as a browse with `?tag=` and `?type=` filters.

#### Scenario: q parameter triggers server query

- **WHEN** a user submits the feed search input with `"moody rain"`
- **THEN** the URL gains `?q=moody+rain`
- **AND** the page issues `GET /api/v1/posts?q=moody+rain` (plus any active `?tag=`)
- **AND** the grid renders the server-returned ranked items
- **AND** no client-side `String.includes` filtering runs against the response

#### Scenario: Pagination is hidden during search

- **WHEN** `?q=` is present in the URL
- **THEN** the pagination control is not rendered
- **AND** the empty-state and result count messaging reflects the search context (e.g., "Searching for …")

#### Scenario: Clearing search restores browse

- **WHEN** a user clears the search input
- **THEN** the `?q=` parameter is removed from the URL
- **AND** the page re-issues `GET /api/v1/posts` (without `q`), restoring chronological browse

---

### Requirement: Global command palette is a semantic search surface

The Cmd+K command palette (rendered by `apps/web/src/routes/(app)/_home/-components/search-dialog.tsx`, opened/closed via the `searchOpen` state in `apps/web/src/routes/-components/providers/modal-provider.tsx`) MUST run a debounced semantic search against `GET /api/v1/posts?q=` as the user types, and render the top ranked posts inline as selectable items. The tag list MUST be demoted to a secondary section that is shown only when the input is empty.

#### Scenario: Typing in the palette triggers search

- **WHEN** the user opens the palette (Cmd+K) and types at least 2 characters
- **THEN** after a debounce of approximately 250ms, the palette issues `GET /api/v1/posts?q=<input>`
- **AND** renders up to 8 ranked posts as `CommandItem` rows showing thumbnail, title, and primary tag name

#### Scenario: Selecting a result navigates to the post

- **WHEN** the user presses Enter on a result row (or clicks it)
- **THEN** the palette closes via `closeSearch()`
- **AND** the router navigates to `/feed/$slug` with the selected post's slug

#### Scenario: Empty input shows tag browser

- **WHEN** the palette input is empty (length ≤ 1)
- **THEN** no search request is issued
- **AND** the palette renders the "Browse by tag" group with all tags from `GET /api/v1/tags`
- **AND** selecting a tag navigates to `/feed?tag=<slug>` and closes the dialog

#### Scenario: cmdk does not re-rank server results

- **WHEN** the palette receives ranked results from the server
- **THEN** the `Command` root has `shouldFilter={false}` so cmdk's built-in substring filter does not reorder or hide items
- **AND** the rendered order matches the server's rank order exactly

#### Scenario: No matches state

- **WHEN** the debounced query is at least 2 characters AND the server returned zero items
- **THEN** the palette shows `CommandEmpty` with text `No matches for "<query>".`

#### Scenario: Loading state during in-flight search

- **WHEN** the debounced query has changed and the request is still pending
- **THEN** the palette shows a loading indicator inline within the results region
- **AND** the previous result list (if any) remains visible until new data arrives, to avoid flicker
