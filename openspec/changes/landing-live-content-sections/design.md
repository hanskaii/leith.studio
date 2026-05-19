## Context

The landing page (`apps/web/src/routes/(app)/_home/index.tsx`) has two `ContentSection` components currently wired to static arrays. The public posts API (`GET /api/v1/posts?tag=<tag>`) already returns all required fields: `id`, `slug`, `title`, `coverThumb`, `coverImage`, `format`, `access`, `tags`, `publishedAt`. The feed is public (no auth required). The `postStatsQueryOptions` function is already imported on the page for the `TrustedCount` component.

## Goals / Non-Goals

**Goals:**

- Live post cards in both content sections
- Lock overlay for premium posts when visitor is not a member
- Reference code aesthetic (Funnnit-style short slug label) beneath each card title
- Sections hide entirely when tag has zero posts
- All queries are Suspense-wrapped with skeleton fallback (existing `PostCardSkeleton` from the feed, or a dedicated landing skeleton)

**Non-Goals:**

- Infinite scroll or pagination within the landing sections (first 6 posts per tag only)
- Creating new API endpoints (the existing public feed endpoint is sufficient)
- Tag management UI or dynamic tag configuration

## Decisions

### D1: Reuse `postsQueryOptions(1, tag)` — no new server function

**Decision**: Use the existing `postsQueryOptions(page, tag)` from `routes/-fn/posts.ts` with `page=1` and the section's tag string. Slice the first 6 items from `data.items` in the component.

**Rationale**: A dedicated `getLandingPostsFn` would duplicate the fetch logic for no functional gain. The existing query already supports tag filtering and returns `PAGE_SIZE=12` items which covers 6 cards with room to spare. The query key `["posts", 1, tag]` is shared with the feed, so if the user navigates to the feed after the landing page the data is already cached.

**Alternative**: New `getLandingPostsFn` fetching only 6 items. Rejected — unnecessary duplication.

### D2: Lock overlay on premium cards, not blur of the entire section

**Decision**: For each card with `access === "premium"` when the user is not a member, apply a semi-transparent overlay with a lock icon over the thumbnail only. The title and reference code remain visible. Clicking the card navigates to the checkout URL instead of the post.

**Rationale**: Matches Funnnit's visual pattern — you can read the titles (creating curiosity) but the image is gated. Full section blur would destroy the preview value.

### D3: Reference code = `@${slug.slice(0, 8)}` truncated

**Decision**: Display `@${post.slug.slice(0, 8)}` as the reference label beneath the title, styled in a muted monospace-like appearance.

**Rationale**: Directly mirrors Funnnit's `@D9..0C19` color-code labels. Leith's slugs are human-readable (from post titles) so the first 8 characters give a recognizable fragment. No extra data field needed.

### D4: Section data wiring via `SectionData` component with Suspense

**Decision**: Extract a `SectionPosts` component that calls `useSuspenseQuery(postsQueryOptions(1, tag))` and renders the grid. Wrap it in `<Suspense fallback={<SectionSkeleton />}>` inside `ContentSection`. The parent `ContentSection` is not async.

**Rationale**: Keeps the Suspense boundary granular — the page shell, nav, and hero all render immediately. Only the post grids suspend. Consistent with the project's "granular loading" rule.

### D5: Card thumbnail aspect ratio stays 14/9

Keep the existing `14/9` aspect ratio from the current `LockCard`. Do not switch to square (Funnnit uses square but our landing already established 14/9 as the standard ratio for post previews).

## Risks / Trade-offs

- **Tag mismatch**: If no published posts are tagged "technique" or "workflow", the section hides. Early in the product's life the landing may show only one section or none. Mitigation: document the tagging convention for creators; fall back gracefully.
- **Stale landing cache**: The `["posts", 1, tag]` query key is shared with the paginated feed. If a user visits the feed at `page=1, tag=undefined` first, the landing queries are separate keys and won't collide. No issue.
- **Large asset hover**: Cards on the landing do not have video hover (that's the feed card behavior). Landing thumbnails are static images only — simpler and faster for first impressions.

## Migration Plan

1. Remove `TECHNIQUE_POSTS`, `WORKFLOW_POSTS`, `PostItem` type from `index.tsx`
2. Rewrite `LockCard` into `PostPreviewCard` accepting a `Post` object
3. Rewrite `ContentSection` to accept `tag` and `heading` props; internally renders `<Suspense><SectionPosts tag={tag} /></Suspense>`
4. Wire the two sections with `tag="technique"` and `tag="workflow"`
5. No server-side changes needed
