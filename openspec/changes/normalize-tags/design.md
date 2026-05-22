## Schema

### `tags` (new)

```typescript
// packages/database/schema/tags.ts
export const tags = sqliteTable(
	"tags",
	{
		id: text("id").primaryKey(),
		slug: text("slug").notNull().unique(),
		name: text("name").notNull(),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull()
	},
	(t) => [index("idx_tags_slug").on(t.slug)]
);

export const postTags = sqliteTable(
	"post_tags",
	{
		postId: text("post_id")
			.notNull()
			.references(() => posts.id, { onDelete: "cascade" }),
		tagId: text("tag_id")
			.notNull()
			.references(() => tags.id, { onDelete: "cascade" })
	},
	(t) => [
		primaryKey({ columns: [t.postId, t.tagId] }),
		index("idx_post_tags_tag_id").on(t.tagId),
		index("idx_post_tags_post_id").on(t.postId)
	]
);

export const tagsRelations = relations(tags, ({ many }) => ({
	postTags: many(postTags)
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
	post: one(posts, {
		fields: [postTags.postId],
		references: [posts.id]
	}),
	tag: one(tags, {
		fields: [postTags.tagId],
		references: [tags.id]
	})
}));
```

### `posts` (modified)

- Remove the column: `tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([])`
- Add to `postsRelations`: `postTags: many(postTags)`

### Why composite PK on `post_tags`

A `(postId, tagId)` composite primary key encodes uniqueness at the DB layer — the same tag cannot be attached to the same post twice. No separate `id` column needed; reads always join by both sides.

## Slug Generation

```typescript
function slugifyTag(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, "") // strip punctuation
		.replace(/\s+/g, "-") // spaces → hyphens
		.replace(/-+/g, "-") // collapse hyphens
		.replace(/^-|-$/g, ""); // trim hyphens
}
```

`"Cinematic Loop"` → `"cinematic-loop"`. `"Noir / Rain"` → `"noir-rain"`. The slug is the URL parameter (`?tag=cinematic-loop`); the `name` is the display label.

Collisions are resolved at insert time by `INSERT OR IGNORE INTO tags`. If two different display names slugify to the same value, the first one wins and subsequent ones link to the existing row — acceptable trade-off, prevents URL ambiguity.

## API Query Shape

### `GET /api/v1/posts`

```sql
SELECT
  posts.id, posts.slug, posts.title, posts.coverThumb, posts.publishedAt,
  postMetadata.format, postMetadata.resolution, postMetadata.isLoop,
  postMetadata.access, postMetadata.previewKey, postMetadata.clipKey,
  (SELECT COUNT(*) FROM post_stats WHERE post_id = posts.id) AS downloadCount,
  JSON_GROUP_ARRAY(
    JSON_OBJECT('slug', tags.slug, 'name', tags.name)
  ) FILTER (WHERE tags.id IS NOT NULL) AS tags
FROM posts
INNER JOIN post_metadata ON post_metadata.post_id = posts.id
LEFT JOIN post_tags ON post_tags.post_id = posts.id
LEFT JOIN tags ON tags.id = post_tags.tag_id
WHERE posts.status = 'published'
  AND post_metadata.processing_status = 'ready'
  AND (
    -- tag filter: only when ?tag= is provided
    posts.id IN (
      SELECT post_id FROM post_tags
      INNER JOIN tags ON tags.id = post_tags.tag_id
      WHERE tags.slug = ?
    )
  )
GROUP BY posts.id
ORDER BY posts.published_at DESC
LIMIT 12 OFFSET ?
```

Notes:

- `JSON_GROUP_ARRAY` + `JSON_OBJECT` aggregates tags per post in one row. Drizzle returns the field as a JSON string; we `JSON.parse` once in the handler.
- The `FILTER (WHERE tags.id IS NOT NULL)` clause ensures posts with no tags get `[]` instead of `[{slug:null,name:null}]`.
- The tag-filter subquery is included unconditionally only when `?tag=` is set; otherwise it's omitted entirely.

Drizzle equivalent (using `sql` template for the aggregate):

```typescript
const items = await db
	.select({
		id: posts.id,
		slug: posts.slug,
		title: posts.title,
		coverThumb: posts.coverThumb,
		publishedAt: posts.publishedAt,
		format: postMetadata.format,
		resolution: postMetadata.resolution,
		isLoop: postMetadata.isLoop,
		access: postMetadata.access,
		previewKey: postMetadata.previewKey,
		clipKey: postMetadata.clipKey,
		downloadCount: sql<number>`(SELECT COUNT(*) FROM ${postStats} WHERE ${postStats.postId} = ${posts.id})`,
		tags: sql<string>`COALESCE(JSON_GROUP_ARRAY(JSON_OBJECT('slug', ${tags.slug}, 'name', ${tags.name})) FILTER (WHERE ${tags.id} IS NOT NULL), '[]')`
	})
	.from(posts)
	.innerJoin(postMetadata, eq(posts.id, postMetadata.postId))
	.leftJoin(postTags, eq(postTags.postId, posts.id))
	.leftJoin(tags, eq(tags.id, postTags.tagId))
	.where(
		and(
			eq(posts.status, "published"),
			eq(postMetadata.processingStatus, "ready"),
			tagSlug
				? inArray(
						posts.id,
						db
							.select({ postId: postTags.postId })
							.from(postTags)
							.innerJoin(tags, eq(tags.id, postTags.tagId))
							.where(eq(tags.slug, tagSlug))
					)
				: undefined
		)
	)
	.groupBy(posts.id)
	.orderBy(desc(posts.publishedAt))
	.limit(PAGE_SIZE)
	.offset((page - 1) * PAGE_SIZE);

// Parse the JSON aggregate
const parsed = items.map((item) => ({
	...item,
	tags: JSON.parse(item.tags) as { slug: string; name: string }[]
}));
```

### `GET /api/v1/tags`

```sql
SELECT
  tags.slug,
  tags.name,
  COUNT(post_tags.post_id) AS postCount
FROM tags
INNER JOIN post_tags ON post_tags.tag_id = tags.id
INNER JOIN posts ON posts.id = post_tags.post_id AND posts.status = 'published'
INNER JOIN post_metadata ON post_metadata.post_id = posts.id AND post_metadata.processing_status = 'ready'
GROUP BY tags.id
ORDER BY postCount DESC, tags.name ASC
```

Returns only tags that have at least one ready+published post. Sorted by usage (popular tags first).

## Studio Approve Workflow — New Steps

### `ai-enrich` step (between `upload-thumbnail` and `create-post`)

```typescript
const enriched = await step.do(
	"ai-enrich",
	async (): Promise<{
		title: string;
		description: string;
		tags: string[];
	}> => {
		if (!thumbnailKey) {
			// No image — fall back to the user's topic / prompts (no AI call)
			return {
				title: row.topic,
				description: row.videoPrompt || row.imagePrompt || row.topic,
				tags: []
			};
		}

		// Fetch the thumbnail from R2 → base64 → vision model
		const obj = await this.env.STORAGE.get(thumbnailKey);
		if (!obj) throw new Error(`Thumbnail not found in R2: ${thumbnailKey}`);
		const buf = await obj.arrayBuffer();
		const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));

		const result = await this.env.AI.run(
			"@cf/meta/llama-3.2-11b-vision-instruct",
			{
				messages: [
					{
						role: "system",
						content:
							'Return a JSON object with keys "title" (short, catchy, max 6 words), "description" (1–2 sentences for a stock asset library), and "tags" (3–6 short keyword strings, Title Case). Tags describe mood, subject, and style. Output JSON only, no prose.'
					},
					{
						role: "user",
						content: [
							{ type: "text", text: `Topic: ${row.topic}` },
							{
								type: "image_url",
								image_url: {
									url: `data:image/jpeg;base64,${base64}`
								}
							}
						]
					}
				]
			}
		);

		// Parse the model's JSON output defensively
		const text = (result as { response?: string }).response ?? "";
		const match = text.match(/\{[\s\S]*\}/);
		if (!match) {
			return {
				title: row.topic,
				description: row.videoPrompt || row.imagePrompt || row.topic,
				tags: []
			};
		}
		const parsed = JSON.parse(match[0]) as {
			title?: string;
			description?: string;
			tags?: string[];
		};

		return {
			title: parsed.title || row.topic,
			description:
				parsed.description ||
				row.videoPrompt ||
				row.imagePrompt ||
				row.topic,
			tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 6) : []
		};
	}
);
```

Failure mode: if the AI call or JSON parse throws, the step retries per Workflow semantics. If retries are exhausted, the workflow errors and `onApproveFailed` reverts `studio_generations.status` to `pending_review` (existing behavior).

If the AI returns degenerate output (no JSON object), we fall back to the topic-based values rather than failing the whole approve — a post with no AI-generated tags is better than no post.

### `create-post` step (modified)

```typescript
const created = await step.do("create-post", async () => {
	const db = database(this.env.DATABASE);
	const newPostId = crypto.randomUUID();
	const title = enriched.title; // ← was: row.topic
	const body = enriched.description; // ← was: row.videoPrompt || ...
	const slug = await uniqueSlug(title, db);
	// ... rest unchanged
	await tx.insert(posts).values({
		id: newPostId,
		slug,
		title,
		body,
		coverImage: row.imageUrl,
		coverThumb: thumbnailKey,
		// NO MORE: tags: []
		status: "draft",
		publishedAt,
		createdAt: now,
		updatedAt: now
	});
	// ... postMetadata + studioGenerations update unchanged
	return { postId: newPostId, slug };
});
```

### `upsert-tags` step (new, between `create-post` and `trigger-video-processing`)

```typescript
await step.do("upsert-tags", async () => {
	if (enriched.tags.length === 0) return { inserted: 0 };
	const db = database(this.env.DATABASE);
	const now = new Date();

	await db.transaction(async (tx: any) => {
		for (const name of enriched.tags) {
			const slug = slugifyTag(name);
			if (!slug) continue;

			// Idempotent: if the slug already exists, do nothing
			const tagId = crypto.randomUUID();
			await tx
				.insert(tags)
				.values({ id: tagId, slug, name, createdAt: now })
				.onConflictDoNothing({ target: tags.slug });

			// Look up the canonical id (either the one we just inserted, or
			// the pre-existing one)
			const [existing] = await tx
				.select({ id: tags.id })
				.from(tags)
				.where(eq(tags.slug, slug))
				.limit(1);

			if (!existing) continue;

			// Idempotent: composite PK on (postId, tagId) makes this a no-op
			// if the link already exists
			await tx
				.insert(postTags)
				.values({ postId: created.postId, tagId: existing.id })
				.onConflictDoNothing();
		}
	});

	return { inserted: enriched.tags.length };
});
```

The step is idempotent so Workflow retries are safe. `crypto.randomUUID()` is generated upfront but only persisted if the insert succeeds (D1 onConflictDoNothing).

## Workflow Step Order

```
lock
  ↓
upload-video
  ↓
upload-thumbnail
  ↓
ai-enrich              ← NEW: vision → { title, description, tags[] }
  ↓
create-post            ← MODIFIED: use enriched title + description
  ↓
upsert-tags            ← NEW: insert tags + post_tags rows
  ↓
trigger-video-processing
  ↓
notify-agent
```

The `ai-enrich` step runs after `upload-thumbnail` because it needs the thumbnail key in R2 to fetch the image. Putting it later (after `create-post`) would couple post creation to AI output and complicate the rollback path on AI failure.

## API Response Shape

Before:

```typescript
{
	id: "...",
	slug: "noir-rain-loop",
	tags: ["Loop", "Rain", "Cinematic"]
}
```

After:

```typescript
{
	id: "...",
	slug: "noir-rain-loop",
	tags: [
		{ slug: "loop", name: "Loop" },
		{ slug: "rain", name: "Rain" },
		{ slug: "cinematic", name: "Cinematic" }
	]
}
```

This is a breaking change to the API contract. Since the only consumer is `apps/web` and both ship together, it lands atomically.

## Frontend Adaptation

### `FeedAsset` type

```typescript
export type FeedAsset = {
	id: string;
	slug: string;
	title: string;
	tags: { slug: string; name: string }[]; // ← was: tag: string
	type: "video" | "audio" | "image";
	access: "free" | "members";
	// ... rest unchanged
};
```

### `toFeedAsset`

```typescript
export function toFeedAsset(item: {
	id: string;
	slug: string;
	title: string;
	coverThumb: string | null;
	tags: { slug: string; name: string }[]; // ← from API
	// ... rest unchanged
}): FeedAsset {
	return {
		// ...
		tags: item.tags
		// ...
	};
}
```

### Feed page tag pills

The pills now source from a dedicated `tagsQueryOptions()`:

```typescript
const { data: tagList } = useSuspenseQuery(tagsQueryOptions());

// pills:
{tagList.map((t) => (
  <button
    key={t.slug}
    onClick={() => onTagChange(tag === t.slug ? undefined : t.slug)}
    aria-pressed={tag === t.slug}
  >
    {t.name}
  </button>
))}
```

The current behavior of deriving tags from the loaded posts in memory (line 66–69 of `index.tsx`) is removed — at scale this would only show tags from the first page.

### Tag filter logic

Current filter (line 74): `if (tag) items = items.filter((a) => a.tag === tag)`.

After: filtering happens server-side. The client just passes `?tag=<slug>` to the API and renders what comes back. The in-memory `.filter()` for `tag` is removed.

The `q` (text search) filter stays client-side for now — server-side search is the next change (AI Search).

### `$slug.tsx` related posts

Current: `p.tags.includes(tag)` where `tag` is the string `post.tags[0]`.

After: uses the slug of the first tag.

```typescript
const primaryTag = post.tags[0]; // { slug, name }
const sameTag = items.filter(
	(p) => p.id !== currentId && p.tags.some((t) => t.slug === primaryTag.slug)
);
```

## Migration Strategy

This is a pre-production codebase — there is no real data to preserve. The migration is:

1. `pnpm db:generate` — drizzle-kit produces SQL that:
    - Creates `tags` table
    - Creates `post_tags` table
    - Drops `posts.tags` column (SQLite: requires table rebuild, drizzle handles via `__new_posts`)
2. `pnpm db:migrate:local` — apply locally
3. `pnpm db:seed` — re-seed; the updated seeder now inserts into `tags` + `post_tags`

Production deployment runs the same migration via `pnpm db:migrate:prod`. Existing seeded data is wiped — acceptable since the project is pre-launch.

## Out of Scope

- **AI Search integration** — explicitly deferred. This change normalizes tags as a prerequisite, but does not push any documents to Cloudflare AI Search. The next change can use `post_tags` join data as AI Search metadata filters.
- **Tag pages** — no `/tags/:slug` route is added; tag filtering remains `/feed?tag=<slug>`.
- **Tag CRUD UI** — no admin UI to edit, merge, or delete tags. Tags are created only via the AI enrichment step in the approve workflow. Manual deletion can be done via D1 console if needed.
- **Tag descriptions / cover images** — the `tags` table has no `description` or `cover` column. Can be added later without breaking changes.
