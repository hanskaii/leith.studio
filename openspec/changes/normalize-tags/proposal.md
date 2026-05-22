## Why

Tags are currently a JSON array column on `posts` (`tags: text("tags", { mode: "json" }).$type<string[]>()`). This blocks:

- Efficient tag filtering — feed handler does `items.filter(p => p.tags.includes(tag))` in JS after fetching, not a SQL `WHERE` clause. At ~thousands of posts this will scan the whole library every request.
- Tag metadata — no way to attach a display name distinct from a URL-safe slug, no creation timestamp, no way to count posts per tag from SQL.
- Multi-tag posts — `toFeedAsset` takes only `tags[0]`, throwing away the rest. With a proper relation each post can join all its tags.
- AI-generated tags — the `StudioApproveWorkflow` `create-post` step hardcodes `tags: []`. There is no place in the approve pipeline for an AI to look at the generated image and propose tags, and no normalization layer to dedupe identical tags across posts.

This change introduces a proper `tags` table with a `post_tags` junction, drops the JSON column, and adds an `ai-enrich` step to `StudioApproveWorkflow` so AI generates `title`, `description` (post body), and `tags[]` from the thumbnail before the post is created.

## What Changes

### Database

- **ADD** `packages/database/schema/tags.ts` — `tags` table (`id`, `slug` unique, `name`, `createdAt`) + `postTags` junction (`postId` FK + `tagId` FK, composite PK) + Drizzle relations
- **MODIFY** `packages/database/schema/posts.ts` — remove the `tags` JSON column, add `postTags: many(postTags)` relation
- **MODIFY** `packages/database/schema/index.ts` — export `tags`, `postTags`, and their relations
- **MODIFY** `packages/database/seeder/seeds/posts.ts` — insert tags + post_tags rows for the 12 seeded posts instead of writing the JSON column

### API

- **MODIFY** `apps/api/src/handlers/posts.handler.ts`:
    - `GET /posts` — LEFT JOIN `post_tags` + `tags`, aggregate per post into `tags: { slug, name }[]`. `?tag=<slug>` filter becomes a `WHERE tags.slug = ?` predicate that constrains the result set in SQL.
    - `GET /posts/:slug` — same join, return tags as `{ slug, name }[]`.

### Studio Approve Workflow

- **MODIFY** `apps/api/src/workflows/studio-approve.workflow.ts`:
    - **ADD** step `ai-enrich` (between `upload-thumbnail` and `create-post`) — calls Workers AI vision model on the thumbnail key in R2, returns `{ title, description, tags: string[] }`.
    - **MODIFY** step `create-post` — use `title` and `description` from `ai-enrich` (fallback to `row.topic` and `row.videoPrompt || row.imagePrompt`). No longer writes `tags: []`.
    - **ADD** step `upsert-tags` (between `create-post` and `trigger-video-processing`) — for each tag name from `ai-enrich`: slugify, `INSERT OR IGNORE INTO tags`, then `INSERT INTO post_tags (postId, tagId)`. Idempotent across runs.

### Frontend

- **MODIFY** `apps/web/src/routes/-fn/posts.ts`:
    - `toFeedAsset` — tags shape changes from `string[]` to `{ slug, name }[]`. `FeedAsset.tag` becomes `FeedAsset.tags: { slug, name }[]` (UI shows first tag's name as primary; tag pills iterate full list).
- **MODIFY** `apps/web/src/routes/(app)/_home/feed/-lib/feed-data.ts` — update `FeedAsset` type; remove the mock `FEED_ASSETS` and `FEED_TAGS` arrays (already replaced by live queries).
- **MODIFY** `apps/web/src/routes/(app)/_home/feed/index.tsx`:
    - Tag pills source from a new `tagsQueryOptions()` that fetches `GET /tags` (distinct tags with post counts), not derived from in-memory posts.
    - `?tag=<slug>` query param matches against `asset.tags.some(t => t.slug === slug)` instead of equality on a single string.
- **MODIFY** `apps/web/src/routes/(app)/_home/feed/$slug.tsx`:
    - Breadcrumb shows `post.tags[0].name`.
    - "Related posts" filter changes to `p.tags.some(t => t.slug === currentSlug)`.

### New tags endpoint

- **ADD** `GET /api/v1/tags` — returns `{ slug, name, postCount }[]` ordered by `postCount desc`. Used by the feed for the pill bar.

## Capabilities

### Modified Capabilities

- `content-library`: Tags become a proper relational entity instead of a denormalized JSON array. Feed filtering shifts from in-memory `.filter()` to a SQL `WHERE` constrained by tag slug. Tag list (pill bar) becomes its own endpoint returning counts.
- `studio-agent`: The approve workflow gains an `ai-enrich` step (vision model on thumbnail → title/description/tags) and an `upsert-tags` step (idempotent insert into normalized tables). Studio agent generations now produce tagged posts automatically.

### Unchanged Capabilities

- `asset-download`: Download URL, file streaming, and the `post_stats` row insert are unchanged.
- `member-access`: Free vs premium gating on `post_metadata.access` is unchanged.
- `content-publishing`: Post status lifecycle (`draft` → `published`) is unchanged.

## Impact

- `packages/database/schema/tags.ts` — new file
- `packages/database/schema/posts.ts` — drop `tags` column, add relation
- `packages/database/schema/index.ts` — add tag exports
- `packages/database/seeder/seeds/posts.ts` — rewrite tag insertion
- Migration: create `tags` + `post_tags` tables, drop `posts.tags` column. This is a destructive schema change but the project is pre-production so no data migration needed beyond the seeder.
- `apps/api/src/handlers/posts.handler.ts` — query rewrite (JOIN + aggregate)
- `apps/api/src/handlers/tags.handler.ts` — new file (one endpoint)
- `apps/api/src/index.ts` — wire `tagsHandler` into the contract under `/api/v1/tags`
- `apps/api/src/workflows/studio-approve.workflow.ts` — two new steps
- `apps/web/src/routes/-fn/posts.ts` — adapt `toFeedAsset` to new tag shape
- `apps/web/src/routes/-fn/tags.ts` — new file with `getTagsFn` + `tagsQueryOptions`
- `apps/web/src/routes/(app)/_home/feed/-lib/feed-data.ts` — `FeedAsset` type update
- `apps/web/src/routes/(app)/_home/feed/index.tsx` — pill bar from live data, slug-based filter
- `apps/web/src/routes/(app)/_home/feed/$slug.tsx` — tag display + related-posts logic
