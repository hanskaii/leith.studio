## ADDED Requirements

### Requirement: Autonomous cron scheduling via natural language

The StudioAgent MUST accept natural language schedule requests and convert them into durable cron-based DO alarms. The schedule MUST persist across browser sessions, DO evictions, and worker restarts.

#### Scenario: User sets a daily schedule

- **WHEN** the user says "generate 1 lofi background video every day at 9am"
- **THEN** the agent calls `setFlowSchedule` with an appropriate cron expression
- **AND** the schedule fires `executeTask` at the specified time each day
- **AND** the user can close the browser — the schedule continues running autonomously

#### Scenario: User cancels a schedule

- **WHEN** the user says "stop the lofi schedule"
- **THEN** the agent calls `cancelSchedule` with the matching schedule ID
- **AND** the schedule no longer fires
- **AND** any in-flight flows from that schedule complete normally

#### Scenario: User lists active schedules

- **WHEN** the user asks "what schedules are running?"
- **THEN** the agent returns all active schedules with description, cron expression, and next fire time

---

### Requirement: Durable step-based generation flow

The agent MUST execute generation as a dynamic step array using a DO alarm-based state machine. Each step transition MUST be persisted to DO SQLite (`current_step` index + `accumulated` payload) before the alarm is scheduled — a crash between steps MUST NOT lose progress. Workflow steps (`generate_image`, `generate_video`) MUST be delegated to existing Cloudflare Workflows (`VIO_IMAGE_WORKFLOW`, `VIO_VIDEO_WORKFLOW`); the agent polls workflow status via `instance.status()`, never calls Vio APIs directly.

#### Scenario: LLM composes step sequence dynamically

- **WHEN** the user requests a generation in chat
- **THEN** the LLM calls `runFlowNow` with a composed `steps: FlowStep[]` array tailored to the user's intent (image-only, text-to-video, image+looping-video, etc.)
- **AND** `accumulated.triggeredBy = "manual"` is recorded
- **AND** the agent inserts a row into `flow_state` and fires the first alarm 0s later

#### Scenario: Generate image via VioImageWorkflow

- **WHEN** `executeTask` fires with current step type `generate_image`
- **THEN** the agent calls `VIO_IMAGE_WORKFLOW.create({ prompt, model, aspect_ratio, count })`
- **AND** stores `instance.id` as `accumulated.imageWorkflowId`
- **AND** advances `currentStep` and schedules an alarm 20s later

#### Scenario: Poll image workflow status

- **WHEN** `executeTask` fires with step type `wait_image_workflow`
- **AND** `VIO_IMAGE_WORKFLOW.get(id).status()` returns `"running"` or `"queued"`
- **THEN** the agent schedules another alarm 15s later WITHOUT advancing `currentStep`

#### Scenario: Image workflow completes

- **WHEN** `instance.status()` returns `"complete"`
- **THEN** the agent writes `accumulated.imageUrl = status.output[0].asset_url`
- **AND** advances `currentStep` and schedules the next alarm immediately (0s)

#### Scenario: Upload image as Vio asset

- **WHEN** the current step is `upload_asset`
- **THEN** the agent fetches the blob from `accumulated.imageUrl`, calls `vio.uploadAsset(blob)`
- **AND** stores `accumulated.imageAssetId = asset.asset_id`

#### Scenario: Generate seamless looping video prompt

- **WHEN** the current step is `generate_loop_prompt`
- **THEN** the agent calls Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`) with topic and image context
- **AND** stores `accumulated.loopingPrompt`

#### Scenario: Generate video via VioVideoWorkflow

- **WHEN** the current step is `generate_video`
- **THEN** the agent resolves frame asset IDs in priority order: `step.params.startFrameRef`/`endFrameRef` from `accumulated.userAssets` if specified, else fallback to `accumulated.imageAssetId`
- **AND** triggers `VIO_VIDEO_WORKFLOW.create(params)` including resolved IDs only when `mode` includes `"i2v"`
- **AND** stores `instance.id` as `accumulated.videoWorkflowId`

#### Scenario: Per-step progress broadcast

- **WHEN** each step finishes and advances `currentStep`
- **THEN** the agent broadcasts `{ type: "flow_progress", flowId, stepType, stepIndex, totalSteps }`
- **AND** the UI updates a progress indicator inline in the conversation

#### Scenario: Flow completes successfully

- **WHEN** the `save_result` step runs
- **THEN** the agent inserts a row into `studioGenerations` with `status: "pending_review"`, `imageUrl`, `videoUrl` (nullable), `imagePrompt`, `videoPrompt` (nullable)
- **AND** broadcasts `{ type: "flow_done", topic, imageUrl, videoUrl, mode: triggeredBy }`
- **AND** deletes the `flow_state` row from DO SQLite

#### Scenario: Flow fails at any step

- **WHEN** any `wait_*_workflow` step observes `instance.status()` returning `"errored"`
- **THEN** the agent deletes the `flow_state` row from DO SQLite
- **AND** broadcasts `{ type: "flow_failed", flowId, stepType, error }`
- **AND** does NOT insert any row into `studioGenerations` — failed flows produce no result

---

### Requirement: Concurrency guard

The agent MUST NOT start a new flow if `MAX_CONCURRENT` (3) flows are already in-flight.

#### Scenario: Cron fires while max concurrent flows are running

- **WHEN** a new flow is about to start (via `runFlowNow` tool or scheduled cron firing)
- **AND** `SELECT COUNT(*) FROM flow_state` returns >= `MAX_CONCURRENT`
- **THEN** the agent does NOT insert a new `flow_state` row
- **AND** broadcasts `{ type: "flow_skipped", reason: "max_concurrent_reached", activeCount }`
- **AND** if triggered manually, the agent replies in chat that the limit is reached
- **AND** if triggered by schedule, the next cron tick gets a fresh chance

---

### Requirement: Auth — content.manage only, no app.use

The `/agents/studio-agent/*` route MUST be protected by `content.manage` permission only. The `app.use` permission check MUST NOT be applied to this route.

#### Scenario: User without content.manage attempts to connect

- **WHEN** a request hits `/agents/studio-agent/*` from a user without `content.manage`
- **THEN** the API returns 403

#### Scenario: Admin with content.manage connects

- **WHEN** a request hits `/agents/studio-agent/*` from a user with `content.manage`
- **THEN** the WebSocket connection is established successfully

---

### Requirement: On-connect state broadcast

When a client connects via WebSocket, the agent MUST immediately broadcast current stats without requiring the user to ask.

#### Scenario: User opens /studio/agent

- **WHEN** the WebSocket connection opens
- **THEN** the agent broadcasts `{ type: "stats", activeSchedules, inFlightFlows, pendingReviews }`
- **AND** the studio agent header displays these counts

---

### Requirement: Review grid auto-refresh on flow completion

When a flow completes and `flow_done` is broadcast, the web client MUST invalidate the review query cache so the review grid reflects the new generation without a manual page refresh.

#### Scenario: Flow completes while user is on /studio/agent

- **WHEN** the agent broadcasts `{ type: "flow_done" }`
- **THEN** the web client calls `queryClient.invalidateQueries(["studio-review"])`
- **AND** if the user navigates to `/studio/review`, the new generation is visible

---

### Requirement: Attached image references for video frame control

The agent MUST allow admins to attach images directly in the chat composer (paste or file picker) and reference them by alias (`@image-1`, `@image-2`) within the same message when requesting video generation with explicit start/end frames. Images are local to the chat message — they do not persist across sessions. If no image is attached, `@image-1` cannot be referenced.

#### Scenario: Agent injects attachment context into LLM prompt

- **WHEN** the user's incoming message contains one or more image content parts
- **THEN** the agent appends a system note to the LLM context like `"User attached 2 image(s) — reference them as @image-1, @image-2 in generate_video step params."`
- **AND** the LLM uses this hint to compose `startFrameRef`/`endFrameRef` correctly even if it cannot directly see images (when using a text-only model)

#### Scenario: Admin attaches an image and requests video generation

- **WHEN** the admin pastes or selects an image file in the composer
- **THEN** a thumbnail preview labeled `image-1` (or `image-2` for the second, etc.) appears above the composer input
- **AND** when the message is sent with text like "generate video @image-1 sebagai start frame pake kling-v3"
- **THEN** the agent receives the message with the image as an `image` content part
- **AND** the agent uploads each attached image to Vio via `vio.uploadAsset()` before inserting `flow_state`
- **AND** the resulting `asset_id`s are stored in `accumulated.userAssets = { "image-1": assetId, ... }`
- **AND** the LLM composes a `generate_video` step with `startFrameRef: "@image-1"`
- **AND** the executor resolves `@image-1` from `accumulated.userAssets` to get the `asset_id`
- **AND** `VIO_VIDEO_WORKFLOW` is triggered with the correct `start_frame_asset_id`

#### Scenario: Two images for explicit start and end frame

- **WHEN** the admin attaches two images and types "generate video @image-1 start, @image-2 end pake kling-v3 mode i2v-fl"
- **THEN** both images are uploaded to Vio at flow start
- **AND** `VIO_VIDEO_WORKFLOW` is triggered with `start_frame_asset_id` from `@image-1` and `end_frame_asset_id` from `@image-2`

#### Scenario: Attachment upload to Vio fails

- **WHEN** the admin attaches an image and sends a message that triggers a flow
- **AND** `vio.uploadAsset()` fails for one or more attachments
- **THEN** the agent does NOT insert a `flow_state` row
- **AND** the agent replies in chat with an error message describing the failed attachment
- **AND** no broadcast `flow_failed` is emitted (since the flow never started)

#### Scenario: Fallback to flow-generated image when no attachment

- **WHEN** no image is attached to the message
- **AND** no `startFrameRef`/`endFrameRef` is in the `generate_video` step
- **THEN** the executor falls back to `accumulated.imageAssetId` from the preceding `upload_asset` step
- **AND** behavior is the standard i2v-fl flow (same image for start and end = seamless loop)

---

### Requirement: Conversational approve from chat

When an admin triggers a manual (non-scheduled) generation, the agent MUST display the result inline in the conversation and allow the admin to approve and publish it directly by replying in chat — without navigating to `/studio/review`. The actual approve work MUST be delegated to `StudioApproveWorkflow` (durable, checkpointed); the agent fires the workflow and returns immediately.

#### Scenario: Manual generation completes

- **WHEN** a flow with `triggeredBy: "manual"` reaches the `save_result` step
- **THEN** the agent appends a new assistant message to the conversation containing the generated image rendered as markdown (`![topic](imageUrl)`)
- **AND** the message includes `topic`, `imagePrompt`, and a prompt asking if the admin wants to publish
- **AND** the message `annotations` contain `{ type: "generation", generationId }` so the agent can reference it later
- **AND** the `studioGenerations` row is inserted with `status: "pending_review"`

#### Scenario: Admin approves from chat

- **WHEN** the admin replies "approve" (or similar intent) in the chat
- **THEN** the agent calls the `approveGeneration` tool with the `generationId` from the preceding message annotations
- **AND** the agent triggers `STUDIO_APPROVE_WORKFLOW.create({ id: \`approve-${generationId}\`, params: { generationId, userId, scheduledAt? } })`
- **AND** the agent broadcasts `{ type: "approve_started", generationId }`
- **AND** the agent replies immediately with "Memproses approval — akan ada notifikasi saat selesai"
- **AND** the workflow executes asynchronously without blocking the chat turn

#### Scenario: Approve workflow completes successfully

- **WHEN** the `StudioApproveWorkflow` finishes all steps successfully
- **THEN** the workflow's final step calls `STUDIO_AGENT.idFromName(userId).onApproveDone({ generationId, postId, type })` via DO RPC
- **AND** the agent appends a new assistant message to the conversation: `"Post created sebagai draft (${type}). [Buka post →](/posts/${postId})"`
- **AND** the agent broadcasts `{ type: "approve_done", generationId, postId, type }`
- **AND** the web client shows a toast and refreshes the review grid

#### Scenario: Admin uses scheduledAt when approving

- **WHEN** the admin says "approve, publish on Friday"
- **THEN** the agent calls `approveGeneration` with `scheduledAt` set to the parsed datetime
- **AND** the workflow's `create-post` step inserts the `posts` row with `scheduledAt` set accordingly

#### Scenario: Approve an image-only generation

- **WHEN** the workflow processes a `studioGenerations` row that has `imageUrl` set but `videoUrl` is null
- **THEN** the `upload-video` step returns null (skipped)
- **AND** the `create-post` step creates a `posts` row with `type: "image"`
- **AND** the `trigger-video-processing` step is skipped (no `videoFileKey`)
- **AND** the post is marked as `draft` (ready for publish via normal post flow)

---

### Requirement: Durable approve workflow with race condition guard

The approve process MUST be implemented as a Cloudflare Workflow (`StudioApproveWorkflow`) so that long-running operations (R2 upload, media processing) survive timeouts and so concurrent approvals do not produce duplicate posts. The workflow MUST be triggerable from both the agent tool and the REST review endpoint, with shared logic.

#### Scenario: Atomic status lock prevents race

- **WHEN** two callers (e.g. agent + REST endpoint) trigger approval for the same `generationId` near-simultaneously
- **THEN** the workflow's `lock` step issues `UPDATE studioGenerations SET status = "processing" WHERE id = ? AND status = "pending_review" RETURNING *`
- **AND** only one caller's UPDATE returns a row; the other returns zero rows
- **AND** the second workflow exits cleanly without creating a duplicate post

#### Scenario: Deterministic workflow instance ID dedups

- **WHEN** two callers create the workflow with the same instance ID `approve-${generationId}`
- **THEN** Cloudflare Workflows refuses the second `create()` call with an "already exists" error
- **AND** the second caller catches the error and treats it as success (the existing instance does the work)

#### Scenario: R2 upload step is checkpointed

- **WHEN** the workflow's `upload-video` step is in progress and the worker is killed mid-upload
- **THEN** Cloudflare Workflows automatically retries the step from the beginning
- **AND** no partial state leaks into the post or DB rows (subsequent steps haven't run)

#### Scenario: Image (thumbnail) upload

- **WHEN** the workflow's `upload-thumbnail` step runs
- **AND** `row.imageUrl` is not null
- **THEN** the workflow fetches the image and stores it at `posts/thumbnail/${generationId}.jpg` in R2
- **AND** `postMetadata.thumbnailKey` is set to that key

#### Scenario: Workflow triggers existing video processing

- **WHEN** the workflow's `trigger-video-processing` step runs
- **AND** a `videoFileKey` was set by `upload-video`
- **THEN** the workflow triggers `VIDEO_PROCESSING_WORKFLOW.create({ postId, fileKey: videoFileKey })`
- **AND** that workflow handles encoding + preview generation via `apps/media-container` (existing pipeline)
- **AND** image-only approvals skip this step

#### Scenario: Workflow notifies agent via DO RPC

- **WHEN** all steps complete successfully
- **THEN** the workflow's final step retrieves the `STUDIO_AGENT` DO stub by `userId` and calls `stub.onApproveDone({ generationId, postId, type })`
- **AND** the agent persists a confirmation message and broadcasts `approve_done`

#### Scenario: Workflow fails at any step

- **WHEN** a workflow step fails irrecoverably (e.g. R2 quota exceeded)
- **THEN** Cloudflare Workflows marks the workflow as `errored`
- **AND** the workflow's error handler invokes `STUDIO_AGENT.onApproveFailed({ generationId, step, error })` via DO RPC
- **AND** the agent reverts `studioGenerations.status` back to `"pending_review"` so the admin can retry
- **AND** broadcasts `{ type: "approve_failed", generationId, step, error }`

---

### Requirement: TopicGenerationWorkflow removed

`TopicGenerationWorkflow` MUST be fully removed. No export, no binding, no endpoint that references it.

#### Scenario: No regression on review endpoint

- **WHEN** the review endpoints (`GET /review`, `POST /review/approve`, `POST /review/reject`) are called
- **THEN** they function identically to before — they read from and write to `studioGenerations`, which the agent populates
