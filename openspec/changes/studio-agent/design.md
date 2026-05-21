## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  apps/web /studio/agent                                             │
│  useAgent("studio-agent", name=userId) + useAgentChat()            │
│  useAISDKRuntime(chat) → AssistantRuntimeProvider + Thread         │
└────────────────────┬────────────────────────────────────────────────┘
                     │ WebSocket
┌────────────────────▼────────────────────────────────────────────────┐
│  apps/api  /agents/studio-agent/:name                              │
│  authMiddleware → protect("content.manage") → routeAgentRequest    │
└────────────────────┬────────────────────────────────────────────────┘
                     │ Durable Object
┌────────────────────▼────────────────────────────────────────────────┐
│  StudioAgent extends AIChatAgent<CloudflareBindings>               │
│                                                                     │
│  this.env.AI                ← Workers AI (expand prompt, loop AI)  │
│  this.env.VIO_IMAGE_WORKFLOW ← triggers image gen (durable)        │
│  this.env.VIO_VIDEO_WORKFLOW ← triggers video gen (durable)        │
│  this.env.DATABASE          ← D1 (save results, read for reviews)  │
│  this.sql                   ← DO SQLite (flow state between alarms) │
│  this.schedule()            ← DO Alarms (cron + step scheduling)   │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Principle: Agent Orchestrates, Workflows Execute

The agent does NOT call VioService directly. The individual Vio Workflows already handle submission + polling + optional upscale with full Cloudflare Workflow durability (per-step checkpointing). The agent's job is to:

1. Decide which steps to run (dynamic, based on user intent)
2. Trigger the appropriate workflow per generation step
3. Poll the **workflow status** (not Vio directly) via alarm-based checks
4. Handle fast steps (AI calls, asset uploads) inline between alarms

```
❌ Old (TopicGenerationWorkflow): directly called vio.generateImage() + own polling loop
✅ New (StudioAgent):  triggers VIO_IMAGE_WORKFLOW.create() → checks instance.status()
```

## Agent Identity

The agent name is the authenticated user's ID (`userId`). Each admin has their own persistent `StudioAgent` DO instance with its own conversation history, schedules, and in-flight flows.

## Dynamic Step-Based Flow

The LLM composes a `steps` array at runtime based on what the user describes. The executor runs each step in order, passing accumulated results between them.

### Step Types

```
Step Type               Executor                        Notes
──────────────────────  ──────────────────────────────  ──────────────────────────────
expand_prompt           this.env.AI.run() inline        Fast (~3s), Workers AI LLM
generate_image          VIO_IMAGE_WORKFLOW.create()     Triggers workflow, returns instanceId
wait_image_workflow     instance.status()               Polls workflow, not Vio directly
upload_asset            fetch(imageUrl) + vio.upload()  Fast, no workflow needed
generate_loop_prompt    this.env.AI.run() inline        Fast (~3s), seamless loop prompt
generate_video          VIO_VIDEO_WORKFLOW.create()     Triggers workflow, returns instanceId
wait_video_workflow     instance.status()               Polls workflow completion
save_result             db.insert() + broadcast         Writes studioGenerations row
```

### Example: Full Loop Flow (user asks for image → looping video)

```json
[
	{ "type": "expand_prompt", "params": { "topic": "lofi background" } },
	{ "type": "generate_image", "params": { "model": "gpt-image-2.0" } },
	{ "type": "wait_image_workflow", "params": {} },
	{ "type": "upload_asset", "params": {} },
	{ "type": "generate_loop_prompt", "params": {} },
	{
		"type": "generate_video",
		"params": { "model": "kling-v3", "mode": "i2v-fl" }
	},
	{ "type": "wait_video_workflow", "params": {} },
	{ "type": "save_result", "params": {} }
]
```

### Example: Image Only

```json
[
	{ "type": "expand_prompt", "params": { "topic": "lofi background" } },
	{ "type": "generate_image", "params": { "model": "nano-banana-2" } },
	{ "type": "wait_image_workflow", "params": {} },
	{ "type": "save_result", "params": {} }
]
```

### Example: Text-to-Video (no image step)

```json
[
	{ "type": "expand_prompt", "params": { "topic": "cyberpunk city" } },
	{
		"type": "generate_video",
		"params": { "model": "sora-2", "mode": "t2v" }
	},
	{ "type": "wait_video_workflow", "params": {} },
	{ "type": "save_result", "params": {} }
]
```

## Step Executor — How Each Step Works

### `expand_prompt`

Calls `this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", ...)` inline (no alarm needed — fast). Writes `imagePrompt` to `accumulated`. Advances `currentStep`, schedules alarm 0s.

### `generate_image`

```
instance = await this.env.VIO_IMAGE_WORKFLOW.create({
  prompt: accumulated.imagePrompt,
  model: step.params.model,
  aspect_ratio: "16:9",
  count: 1
})
accumulated.imageWorkflowId = instance.id
currentStep++
schedule alarm 20s
```

### `wait_image_workflow`

```
instance = await this.env.VIO_IMAGE_WORKFLOW.get(accumulated.imageWorkflowId)
status = await instance.status()

"running" | "queued" → schedule alarm 15s (same step, no index change)
"complete" → accumulated.imageUrl = status.output[0].asset_url
             currentStep++, schedule alarm 0s
"errored"  → failFlow()
```

`status.output` is `Generation[]` (return type of `VioImageWorkflow.run()`).

### `upload_asset`

Downloads image blob via `fetch(accumulated.imageUrl)`, calls `vio.uploadAsset(blob)`. Writes `accumulated.imageAssetId`. Advances step, alarm 0s.

### `generate_loop_prompt`

Workers AI call: given topic + imageUrl context, generate a seamless looping video prompt. Writes `accumulated.loopingPrompt`. Advances step, alarm 0s.

### `generate_video`

Frame asset IDs are resolved in priority order:

1. `step.params.startFrameRef` / `step.params.endFrameRef` — `@image-1` alias pointing to `accumulated.userAssets["image-1"]` (uploaded from message attachment at flow start)
2. `accumulated.imageAssetId` — asset produced by the preceding `upload_asset` step in the same flow

```
function resolveAssetId(ref?: string, fallback?: number): number | undefined {
  if (ref) {
    const alias = ref.replace(/^@/, "")
    return accumulated.userAssets?.[alias]
  }
  return fallback
}

const startId = resolveAssetId(step.params.startFrameRef, accumulated.imageAssetId)
const endId   = resolveAssetId(step.params.endFrameRef,   accumulated.imageAssetId)

instance = await this.env.VIO_VIDEO_WORKFLOW.create({
  prompt: accumulated.loopingPrompt ?? accumulated.imagePrompt,
  model: step.params.model,
  mode: step.params.mode,                   // "i2v-fl", "i2v", "t2v"
  aspect_ratio: "16:9",
  ...(mode.includes("i2v") ? {
    start_frame_asset_id: startId,
    ...(mode === "i2v-fl" ? { end_frame_asset_id: endId } : {})
  } : {})
})
accumulated.videoWorkflowId = instance.id
currentStep++
schedule alarm 30s
```

### `wait_video_workflow`

```
instance = await this.env.VIO_VIDEO_WORKFLOW.get(accumulated.videoWorkflowId)
status = await instance.status()

"running" | "queued" → schedule alarm 20s
"complete" → accumulated.videoUrl = status.output.asset_url
             currentStep++, schedule alarm 0s
"errored"  → failFlow()
```

`status.output` is `Generation` (return type of `VioVideoWorkflow.run()`).

### `save_result`

Behavior differs based on `accumulated.triggeredBy`:

**`"manual"`** — admin requested directly in chat:

```
const generationId = crypto.randomUUID()

db.insert(studioGenerations, {
  id: generationId,
  topic: accumulated.topic,
  imageUrl, videoUrl, imagePrompt,
  videoPrompt: accumulated.loopingPrompt ?? null,
  status: "pending_review",
  createdAt: new Date()
})

// Append result as new assistant message in conversation
await this.saveMessages([
  ...this.messages,
  {
    id: generateId(),
    role: "assistant",
    content: [
      { type: "text", text:
        `Selesai!\n\n![${accumulated.topic}](${imageUrl})\n\n` +
        `**Topic:** ${accumulated.topic}\n` +
        `**Prompt:** ${accumulated.imagePrompt}\n\n` +
        `Mau langsung publish ke platform?`
      }
    ],
    // store generationId in metadata so approve tool can read it
    annotations: [{ type: "generation", generationId }]
  }
])

this.broadcast({ type: "flow_done", mode: "manual" })
DELETE FROM flow_state WHERE id = flowId
```

**`"schedule"`** — fired by cron, admin may not be online:

```
db.insert(studioGenerations, { ..., status: "pending_review" })
this.broadcast({ type: "flow_done", mode: "schedule", topic, imageUrl })
// toast on client + review grid refresh — no inline message
DELETE FROM flow_state WHERE id = flowId
```

## Database Schema

### Removed Tables

| Table                 | File                     | Reason                                                            |
| --------------------- | ------------------------ | ----------------------------------------------------------------- |
| `generation_topics`   | `generation-topics.ts`   | Parent topic entity — replaced by `topic` field on generation row |
| `topic_generations`   | `topic-generations.ts`   | Old workflow result rows — replaced by `studio_generations`       |
| `generation_settings` | `generation-settings.ts` | Global defaults — managed via agent conversation                  |

### New Table: `studio_generations`

```typescript
// packages/database/schema/studio-generations.ts
export const studioGenerations = sqliteTable(
	"studio_generations",
	{
		id: text("id").primaryKey(),
		topic: text("topic").notNull(), // user's description / topic
		imageUrl: text("image_url"), // Vio image URL (temp, pre-approve)
		videoUrl: text("video_url"), // Vio video URL (temp, pre-approve)
		imagePrompt: text("image_prompt"), // expanded image prompt used
		videoPrompt: text("video_prompt"), // loop prompt used for video
		status: text("status", {
			enum: ["pending_review", "processing", "approved", "rejected"]
		})
			.notNull()
			.default("pending_review"),
		postId: text("post_id"), // FK to posts, set on approve
		scheduledAt: integer("scheduled_at", { mode: "timestamp" }), // optional publish date
		createdAt: integer("created_at", { mode: "timestamp" }).notNull()
	},
	(t) => [
		index("idx_studio_generations_status").on(t.status),
		index("idx_studio_generations_created").on(t.createdAt)
	]
);
```

The `"processing"` status is set atomically when an approval workflow takes ownership of a row, acting as a DB-level race guard.

Flat — no parent entity. One row per result the agent produces, regardless of flow shape (image-only, video-only, image+video). The `topic` field carries the human description.

### Review & Approve Flow

**`GET /api/v1/studio/review`** — queries `studioGenerations` where `status = "pending_review"`, ordered by `createdAt desc`.

**`POST /api/v1/studio/review/approve`** — does NOT do the work inline. Instead:

1. Triggers `STUDIO_APPROVE_WORKFLOW` with deterministic instance ID `approve-${generationId}` and params `{ generationId, userId, scheduledAt? }`
2. Returns immediately with `202 { workflowId }`
3. The actual approve work happens durably inside the workflow

**`POST /api/v1/studio/review/reject`** — update `studioGenerations.status = "rejected"`. Single fast DB write, no workflow needed.

**Shared logic**: Both the REST endpoint and the agent's `approveGeneration` tool trigger the SAME workflow. The deterministic instance ID dedups concurrent triggers (calling `WORKFLOW.create({ id })` twice with the same ID throws — second caller catches and treats as success). DB-level lock provides defense-in-depth.

## Studio Approve Workflow

`apps/api/src/workflows/studio-approve.workflow.ts` — `StudioApproveWorkflow extends WorkflowEntrypoint<CloudflareBindings, ApproveParams>`.

Params: `{ generationId, userId, scheduledAt? }`.

```
step "lock":
  const updated = await db.update(studioGenerations)
    .set({ status: "processing" })
    .where(and(
      eq(studioGenerations.id, generationId),
      eq(studioGenerations.status, "pending_review")
    ))
    .returning()
  if (updated.length === 0) {
    // Already taken by another approval — exit cleanly
    return { skipped: true, reason: "not_pending_review" }
  }
  return updated[0]

step "upload-video":
  if (!row.videoUrl) return null
  const res = await fetch(row.videoUrl)
  const key = `posts/video/${generationId}.mp4`
  await this.env.STORAGE.put(key, res.body)
  return key

step "upload-thumbnail":
  // imageUrl is the first frame (for image+video flows) — natural thumbnail
  if (!row.imageUrl) return null
  const res = await fetch(row.imageUrl)
  const key = `posts/thumbnail/${generationId}.jpg`
  await this.env.STORAGE.put(key, res.body)
  return key

step "create-post":
  const postId = crypto.randomUUID()
  const type = videoFileKey ? "video" : "image"
  await db.transaction(async (tx) => {
    await tx.insert(posts).values({
      id: postId, status: "draft", type, scheduledAt
    })
    await tx.insert(postMetadata).values({
      postId,
      imageUrl: row.imageUrl,
      fileKey: videoFileKey,
      thumbnailKey
    })
    await tx.update(studioGenerations)
      .set({ status: "approved", postId })
      .where(eq(studioGenerations.id, generationId))
  })
  return postId

step "trigger-video-processing":
  // VIDEO_PROCESSING_WORKFLOW handles encoding + preview generation via
  // the existing apps/media-container (mediabunny pipeline).
  if (!videoFileKey) return null
  await this.env.VIDEO_PROCESSING_WORKFLOW.create({
    params: { postId, fileKey: videoFileKey }
  })

step "notify-agent":
  // Send DO RPC to the user's StudioAgent so it can broadcast + append message
  const id = this.env.STUDIO_AGENT.idFromName(userId)
  const stub = this.env.STUDIO_AGENT.get(id)
  await stub.onApproveDone({ generationId, postId, type })
```

Each `step.do()` is independently checkpointed and retried by Cloudflare Workflows. R2 uploads and media-container processing can take 30s+ without affecting the agent's tool call timeout (since the agent fires the workflow and returns immediately).

## DO SQLite State Schema

```sql
CREATE TABLE IF NOT EXISTS flow_state (
  id          TEXT PRIMARY KEY,
  steps       TEXT NOT NULL,        -- JSON: FlowStep[]
  current_step INTEGER NOT NULL,    -- index into steps array
  accumulated TEXT NOT NULL,        -- JSON: results from completed steps
  started_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
)
```

`accumulated` is initialized at flow start with `topic`, `triggeredBy`, and optional `userAssets` (uploaded from message attachments). It grows as steps complete:

```json
{
	"topic": "lofi background",
	"triggeredBy": "manual",
	"userAssets": { "image-1": 67890 },
	"imagePrompt": "Soft amber light...",
	"imageWorkflowId": "wf-abc123",
	"imageUrl": "https://...",
	"imageAssetId": 67890,
	"loopingPrompt": "Slow drifting particles...",
	"videoWorkflowId": "wf-def456",
	"videoUrl": "https://..."
}
```

## Concurrency Guard

```
executeTask (step type: "start" or currentStep === 0)
  → SELECT COUNT(*) FROM flow_state
  → if >= MAX_CONCURRENT (3): broadcast flow_skipped, return
  → else: INSERT flow_state, proceed
```

## Model Clarification (LLM Behavior)

When user does not specify a model, the LLM must ask before calling any tool. The system prompt includes a catalog of available models:

```
## Image Models
| Model              | Description                    | Speed  |
| gpt-image-2.0      | Photorealistic, high quality   | ~45s   |
| nano-banana-2      | Fast, general purpose          | ~15s   |
| nano-banana-pro    | High quality nano variant      | ~25s   |
| seedream-5.0-lite  | Artistic, painterly            | ~30s   |
| kling-3.0          | Cinematic, detailed            | ~35s   |

## Video Models
| Model           | Description                    | Best for         |
| kling-v3        | Smooth motion, reliable        | Seamless loops   |
| sora-2          | Highest quality                | Premium content  |
| veo-3.1-fast    | Natural motion, fast           | Quick turnaround |
| seedance-2.0    | Creative, dynamic              | Artistic content |

Rule: NEVER call runFlowNow or setFlowSchedule if model is not specified.
Always present the model table and wait for user selection first.
```

## LLM Tools (onChatMessage)

### `runFlowNow`

Parameters: `topic`, `steps` (compiled by LLM).

Execute:

1. Extract image content parts from the current user message
2. For each: `vio.uploadAsset(blob)` → build `userAssets = { "image-1": assetId, ... }`
3. If any upload fails: reply with error message, do NOT insert flow_state
4. Concurrency guard: if `flow_state count >= 3`, broadcast `flow_skipped`, reply in chat, return
5. Insert `flow_state` row with `accumulated = { topic, triggeredBy: "manual", userAssets? }`
6. Schedule `executeTask` alarm 0s

### `setFlowSchedule`

Parameters: `cron`, `description`, `topic`, `steps` (LLM-compiled FlowStep[]).
Execute: `this.schedule(cron, "executeTask", JSON.stringify({ steps, accumulated: { topic, triggeredBy: "schedule" } }))`.

### `listSchedules`

Execute: `this.getSchedules()` — returns id, description, cron, next fire time.

### `cancelSchedule`

Parameters: `taskId`.
`needsApproval: true` when schedule description contains "daily" or "every".

### `listPendingReviews`

Queries `studioGenerations` where `status = "pending_review"`. Returns count + list with `topic`, `imageUrl`, `videoUrl`, `createdAt`.

### `approveGeneration`

Parameters: `generationId` (string), `scheduledAt?` (ISO datetime string — optional publish date).

Fire-and-forget pattern: trigger the workflow, reply immediately with "Memproses..." — the agent will append a follow-up message via `onApproveDone` when the workflow completes.

```
1. row = db.query.studioGenerations.findFirst({ where: eq(studioGenerations.id, generationId) })
2. if (!row) → return error message
3. if (row.status !== "pending_review") → return "Already approved or processing"
4. try {
     await this.env.STUDIO_APPROVE_WORKFLOW.create({
       id: `approve-${generationId}`,
       params: { generationId, userId: this.name, scheduledAt }
     })
   } catch (e) {
     // Instance with this ID already exists → another approval in flight — that's fine
   }
5. broadcast { type: "approve_started", generationId }
6. return "Memproses approval — akan ada notifikasi saat selesai"
```

`needsApproval: false` — the admin's explicit "approve" message in chat IS the approval.

### `onApproveDone(payload)` (DO RPC method, called by workflow)

Not an LLM tool — internal method invoked by `StudioApproveWorkflow` last step:

```
async onApproveDone({ generationId, postId, type }) {
  // Append assistant message to conversation
  await this.saveMessages([
    ...this.messages,
    {
      id: generateId(),
      role: "assistant",
      content: [{ type: "text", text:
        `Post created sebagai draft (${type}).\n\n` +
        `[Buka post →](/posts/${postId})`
      }]
    }
  ])
  // Broadcast to connected clients
  this.broadcast({ type: "approve_done", generationId, postId, type })
}
```

### `getStats`

Returns: active schedules, in-flight flows (from `flow_state` count), pending reviews.

## Routing & Auth

```typescript
// apps/api/src/index.ts
app.all(
	"/agents/studio-agent/*",
	authMiddleware,
	protect("content.manage"),
	async (c) => {
		const user = c.get("user") as any;
		const res = await routeAgentRequest(c.req.raw, c.env, {
			metadata: { userId: user.id }
		});
		if (res) return res;
		return c.notFound();
	}
);
```

`content.manage` only — `app.use` is NOT required for studio agent access.

## Web UI (assistant-ui)

```
useAgent({ agent: "studio-agent", name: session.user.id, ... })
  ↓
useAgentChat({ agent, credentials: "include", onMessage })
  ↓
useAISDKRuntime(chat)          ← @assistant-ui/react-ai-sdk
  ↓
AssistantRuntimeProvider + Thread   ← @assistant-ui/react
```

### AttachmentAdapter (image attach in composer)

Images are attached directly in the chat composer (paste or file picker). No upload happens on attach — the file is converted to a data URL for preview. When the message is sent, the AI SDK includes the image as an `image` content part in the message. The agent then uploads to Vio inline at flow start.

```tsx
const attachmentAdapter: AttachmentAdapter = {
	accept: "image/*",
	add: async ({ file }) => {
		const dataUrl = await new Promise<string>((resolve) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.readAsDataURL(file);
		});
		// alias auto-assigned by index: image-1, image-2, etc.
		const alias = `image-${Date.now()}`;
		return { id: alias, name: alias, contentType: file.type, url: dataUrl };
	},
	remove: async () => {
		/* local only, nothing to clean up */
	}
};
```

Thumbnails appear above the composer labeled `image-1`, `image-2`. User types `"@image-1"` as plain text — the LLM understands the reference. If no image is attached, `@image-1` cannot be referenced (nothing to resolve).

### Image upload at flow start (`runFlowNow`)

When the user sends a message that contains image attachments AND triggers a flow, `onChatMessage` uploads each attachment to Vio before inserting `flow_state`:

```
const attachments = message.content.filter(p => p.type === "image")
const userAssets: Record<string, number> = {}

for (let i = 0; i < attachments.length; i++) {
  const blob = dataUrlToBlob(attachments[i].image)
  const asset = await new VioService(this.env.VIO_API_KEY).uploadAsset(blob)
  userAssets[`image-${i + 1}`] = asset.asset_id
}

// stored in accumulated so generate_video can resolve @image-1 → asset_id
accumulated.userAssets = userAssets
```

If there are no attachments, `accumulated.userAssets` is omitted and `generate_video` falls back to `accumulated.imageAssetId`.

`onMessage` handles broadcast events:

- `flow_done` → `toast.success(...)` + `queryClient.invalidateQueries(["studio-review"])`
- `flow_skipped` → `toast.warning(...)`
- `flow_failed` → `toast.error(...)`
- `stats` → update header state

Thread customizations: empty state suggestions, composer placeholder "Ask the studio agent...".

## Broadcast Events

```typescript
{ type: "flow_done",       topic, imageUrl?, videoUrl?, mode, durationMs }
{ type: "flow_skipped",    reason: "max_concurrent_reached", activeCount }
{ type: "flow_progress",   flowId, stepType, stepIndex, totalSteps }
{ type: "flow_failed",     flowId, stepType, error }
{ type: "approve_started", generationId }
{ type: "approve_done",    generationId, postId, type: "image" | "video" }
{ type: "approve_failed",  generationId, step, error }
{ type: "stats",           activeSchedules, inFlightFlows, pendingReviews }
```

On WebSocket open, agent immediately broadcasts `stats`.
