## ADDED Requirements

### Requirement: Search index step in approve workflow

The `StudioApproveWorkflow` MUST include an `index-search` step that runs after `upsert-tags` and before `trigger-video-processing`. The step MUST write a search document to R2 at `search/posts/{postId}.md` using the just-created post's id, slug, AI-enriched title and description, and the tags assigned by the preceding `upsert-tags` step. The step MUST be idempotent so Cloudflare Workflows retries are safe.

#### Scenario: New post is indexed on approve

- **WHEN** the `StudioApproveWorkflow` reaches the `index-search` step
- **THEN** the step calls `indexPost(this.env, { id, slug, title, body, tags, format, access, publishedAt })`
- **AND** an R2 object exists at `search/posts/{postId}.md`
- **AND** the document's body contains the AI-enriched title and description from the preceding `ai-enrich` step

#### Scenario: Step is idempotent across retries

- **WHEN** the workflow retries the `index-search` step
- **THEN** the R2 `PUT` overwrites the prior document with identical content
- **AND** no duplicate index entries are created (R2 keys are unique by postId)

#### Scenario: Step failure surfaces through the existing error path

- **WHEN** the R2 `PUT` call throws inside `index-search`
- **THEN** the workflow's outer try/catch catches the error
- **AND** `onApproveFailed` is called with `step: "index-search"` and the error message
- **AND** the studio generation row is reverted to `pending_review` so the admin can retry

---

### Requirement: Indexable post payload includes enriched fields

The `index-search` step MUST receive the AI-enriched `title`, `description`, and `tags[]` values produced by the `ai-enrich` step earlier in the workflow — NOT the raw `row.topic` or unprocessed prompt strings. Tag entries MUST be passed as `{ slug, name }` objects where `slug = slugifyTag(name)`; entries that slugify to an empty string MUST be filtered out so they do not pollute the document's front matter.

#### Scenario: Search document uses enriched title

- **WHEN** the `ai-enrich` step returned `{ title: "Stormy Noir", description: "Dark rain over wet pavement.", tags: ["Loop", "Dark"] }`
- **THEN** the indexed document's body contains `# Stormy Noir`
- **AND** the body contains `Dark rain over wet pavement.`
- **AND** the front matter `tags` field lists `[loop, dark]` (slug form)

#### Scenario: Empty-slug tags are dropped before indexing

- **WHEN** the `ai-enrich` step returned a tag whose name slugifies to an empty string (e.g., `"/"` or whitespace)
- **THEN** the `index-search` step filters that entry out before building the document
- **AND** the front matter `tags` list does not contain any empty or `null` entries
