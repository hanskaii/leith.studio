## Why

The landing page currently shows 12 hardcoded dummy post cards with placeholder titles and colored backgrounds. Visitors see a fabricated preview with no relation to actual published content, which reduces credibility and conversion. Now that the feed is public and posts are published, the landing page should surface real content.

## What Changes

- Replace `TECHNIQUE_POSTS` and `WORKFLOW_POSTS` static arrays with live post data fetched from the public API
- Content sections show real cover thumbnails (`coverThumb ?? coverImage`) instead of solid-color placeholder backgrounds
- Premium posts show a blurred lock overlay when the visitor is not a member; free posts are shown openly
- Post cards display the actual title and a short reference slug (e.g. `@slug-prefix`) beneath the thumbnail, matching the Funnnit reference aesthetic
- Format badge (MP4, PNG, etc.) shown per card when present
- Section footer "count" label dynamically shows the total published post count from the API
- Sections are filtered by tag: first section uses tag `"technique"`, second uses `"workflow"`; if fewer than 6 posts exist for a tag, the section renders however many are available (minimum 1 to render the section at all)
- Sections with zero matching posts are hidden entirely
- Clicking a locked card redirects to the purchase/activate URL; clicking an unlocked card links to `/feed/$slug`
- Static `TECHNIQUE_POSTS` / `WORKFLOW_POSTS` arrays and the `PostItem` type are removed

## Capabilities

### New Capabilities

- `landing-post-preview`: Landing page content sections fetch and display real published posts, with live thumbnails, access-gate lock overlays, and reference codes.

### Modified Capabilities

(none — no existing spec-level requirements change)

## Impact

- `apps/web/src/routes/(app)/_home/index.tsx` — major rewrite of `LockCard`, `ContentSection`, and the data wiring
- `apps/web/src/routes/-fn/posts.ts` — needs a `getLandingPostsFn` / `landingPostsQueryOptions` that fetches up to 6 posts per tag without pagination overhead, OR reuse `postsQueryOptions(1, tag)` directly (decide in design)
- No API changes — feed is already public and returns all required fields (`coverThumb`, `format`, `access`, `slug`, `fileUrl`)
- No database changes
