## ADDED Requirements

### Requirement: AI thumbnail enrichment in approve workflow

The `StudioApproveWorkflow` MUST include an `ai-enrich` step that runs after `upload-thumbnail` and before `create-post`. The step MUST call a Workers AI vision model on the uploaded thumbnail, parse a JSON object containing `title`, `description`, and `tags[]` from the model's response, and pass those values to the subsequent `create-post` step. If the AI call fails or returns un-parseable output, the step MUST fall back to topic-based defaults rather than failing the workflow.

#### Scenario: Vision model generates enrichment from thumbnail

- **WHEN** the workflow reaches the `ai-enrich` step
- **AND** `thumbnailKey` is non-null (a thumbnail was uploaded to R2)
- **THEN** the step fetches the object from `env.STORAGE`, encodes it as base64
- **AND** calls `env.AI.run("@cf/meta/llama-3.2-11b-vision-instruct", { messages })` with a system prompt requesting JSON output with `title` (max 6 words), `description` (1–2 sentences), and `tags` (3–6 Title Case strings)
- **AND** parses the first `{...}` JSON object from the response
- **AND** returns `{ title, description, tags }` to be used by the next step

#### Scenario: Fallback when no thumbnail

- **WHEN** the workflow reaches the `ai-enrich` step
- **AND** `thumbnailKey` is null (no image was generated)
- **THEN** the step returns `{ title: row.topic, description: row.videoPrompt || row.imagePrompt || row.topic, tags: [] }` without making an AI call

#### Scenario: Fallback on AI parse failure

- **WHEN** the AI call returns text that does not contain a `{...}` JSON object
- **OR** the JSON parse throws
- **THEN** the step returns the topic-based fallback values (same as the no-thumbnail case)
- **AND** the workflow continues to `create-post` rather than erroring

#### Scenario: Tag count capped

- **WHEN** the AI returns more than 6 tags
- **THEN** the step truncates the array to the first 6 entries
- **AND** subsequent `upsert-tags` only processes those 6

---

### Requirement: Tag upsert in approve workflow

The `StudioApproveWorkflow` MUST include an `upsert-tags` step that runs after `create-post` and before `trigger-video-processing`. For each tag name returned by `ai-enrich`, the step MUST slugify the name, insert into `tags` (using `ON CONFLICT (slug) DO NOTHING` for idempotency), look up the canonical `tagId` by slug, and insert into `post_tags` linking the newly-created post to the tag. The step MUST be idempotent so Cloudflare Workflows retries are safe.

#### Scenario: New tags are created

- **WHEN** the AI returns tag names that do not yet exist in the `tags` table
- **THEN** new rows are inserted into `tags` with generated UUID `id`, slugified `slug`, original `name`, and `now` as `createdAt`
- **AND** the corresponding `post_tags` rows are inserted linking the post

#### Scenario: Existing tags are reused

- **WHEN** the AI returns a tag name whose slug already exists in `tags`
- **THEN** no new `tags` row is created (`ON CONFLICT (slug) DO NOTHING`)
- **AND** the canonical existing `tagId` is fetched via `SELECT id FROM tags WHERE slug = ?`
- **AND** a `post_tags` row links the new post to that existing tag

#### Scenario: Empty tags array

- **WHEN** the AI returned no tags (empty array from `ai-enrich`)
- **THEN** the step returns immediately without database writes
- **AND** the workflow continues normally; the post simply has no tags

#### Scenario: Workflow retry safety

- **WHEN** the workflow retries the `upsert-tags` step after a failure
- **THEN** the same `INSERT OR IGNORE` semantics on `tags.slug` and the composite PK on `post_tags` prevent duplicates
- **AND** the retry produces the same end state as a successful first attempt

---

### Requirement: Create-post uses AI-enriched fields

The `create-post` step MUST use `title` and `description` (as `body`) from the `ai-enrich` step's return value, falling back to the topic and prompt fields when AI enrichment was skipped or failed. The step MUST NOT write the removed `posts.tags` JSON column.

#### Scenario: Post created with AI title and description

- **WHEN** `ai-enrich` returns `{ title: "Stormy Noir", description: "Dark rain over wet pavement.", tags: [...] }`
- **THEN** the `posts` insert uses `title = "Stormy Noir"` and `body = "Dark rain over wet pavement."`
- **AND** the `slug` is generated from the enriched title via `uniqueSlug`

#### Scenario: No tags column write

- **WHEN** the `create-post` step inserts a row into `posts`
- **THEN** the insert values MUST NOT include a `tags` field
- **AND** the SQL succeeds because the column no longer exists in the schema
