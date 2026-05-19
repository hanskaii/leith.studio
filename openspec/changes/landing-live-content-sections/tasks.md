## 1. Cleanup — Remove Static Data

- [x] 1.1 In `apps/web/src/routes/(app)/_home/index.tsx`, delete the `TECHNIQUE_POSTS` and `WORKFLOW_POSTS` constant arrays and the `PostItem` type alias

## 2. PostPreviewCard Component

- [x] 2.1 Replace the `LockCard` component with a new `PostPreviewCard` component that accepts a post object (`PostsData["items"][number]`) and an `isLocked: boolean` prop
- [x] 2.2 `PostPreviewCard` renders the cover thumbnail (`(post as any).coverThumb ?? post.coverImage`) in a `14/9` aspect-ratio container; if neither exists, render a warm neutral fallback background (`oklch(0.92 0.010 58)`)
- [x] 2.3 When `isLocked` is true, render a semi-transparent overlay with a lock icon over the thumbnail (reuse existing `LockIcon` SVG)
- [x] 2.4 Below the thumbnail, render the post title in the existing heading style and a reference label `@${post.slug.slice(0, 8)}` in a muted small monospace-style
- [x] 2.5 When `format` is present, render a small uppercase format badge (MP4, PNG, etc.) between the title and reference label
- [x] 2.6 Wrap the card in a `<Link to="/feed/$slug">` when not locked; wrap in an `<a href={checkoutUrl}>` when locked

## 3. SectionSkeleton & SectionPosts Components

- [x] 3.1 Add a `SectionSkeleton` component that renders a 3-column grid of 6 skeleton cards in the same `14/9` aspect ratio (matching existing `PostCardSkeleton` style)
- [x] 3.2 Add a `SectionPosts` component that accepts `tag: string`, `heading: string`, `isMember: boolean`, `accessUrl: string`; calls `useSuspenseQuery(postsQueryOptions(1, tag))`; slices the first 6 items; renders `null` if zero items; otherwise renders the grid of `PostPreviewCard` components with `isLocked` computed from `post.access === "premium" && !isMember`

## 4. ContentSection Rewire

- [x] 4.1 Rewrite `ContentSection` to accept `id`, `heading`, `tag`, `isMember`, `accessUrl`, `formatLabel` props — remove the `posts` prop
- [x] 4.2 Inside `ContentSection`, wrap `<SectionPosts>` in a `<Suspense fallback={<SectionSkeleton />}>`
- [x] 4.3 Update the section footer count label to use `data.total` from the query (lift it from `SectionPosts`) — use a separate Suspense-wrapped `SectionCount` sub-component that reads `postsQueryOptions(1, tag)` and renders `{data.total} Breakdowns`
- [x] 4.4 Update the two `<ContentSection>` calls in `LandingPage` to pass `tag="technique"` and `tag="workflow"` respectively (remove the static `posts` prop)

## 5. Verification

- [ ] 5.1 With posts tagged "technique" and "workflow" published, confirm both sections render real thumbnails
- [ ] 5.2 Confirm premium cards show lock overlay for logged-out visitor and no overlay for member
- [ ] 5.3 Confirm reference labels appear as `@<slug-prefix>` beneath each title
- [ ] 5.4 Confirm sections with zero matching posts are hidden entirely
- [x] 5.5 Run `pnpm test` — no regressions
