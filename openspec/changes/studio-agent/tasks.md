## 0. Database Schema

- [x] 0.1 Delete `packages/database/schema/generation-topics.ts`
- [x] 0.2 Delete `packages/database/schema/topic-generations.ts`
- [x] 0.3 Delete `packages/database/schema/generation-settings.ts`
- [x] 0.4 Create `packages/database/schema/studio-generations.ts` with `studioGenerations` table: `id` (text PK), `topic` (text notNull), `imageUrl` (text nullable), `videoUrl` (text nullable), `imagePrompt` (text nullable), `videoPrompt` (text nullable), `status` (text enum: `"pending_review" | "processing" | "approved" | "rejected"`, default `"pending_review"`), `postId` (text nullable), `scheduledAt` (integer timestamp nullable), `createdAt` (integer timestamp notNull). Add indexes on `status` and `createdAt`.
- [x] 0.5 Update `packages/database/schema/index.ts`: remove exports for `generationTopics`, `topicGenerations`, `generationSettings`, `DEFAULT_IMAGE_PROMPT_TEMPLATE`, `DEFAULT_VIDEO_PROMPT_TEMPLATE`; add export for `studioGenerations`
- [ ] 0.6 ⚠️ NEEDS INTERACTIVE TTY: Run `pnpm db:generate` to generate migration SQL (drops three old tables, creates `studio_generations`) — drizzle-kit will prompt "rename or drop" for each removed table; answer "create table" for studio_generations and "drop table" for the three removed ones
- [ ] 0.7 ⚠️ NEEDS INTERACTIVE TTY: Run `pnpm db:migrate` (local) after 0.6 generates the SQL
- [x] 0.8 Update `apps/api/src/handlers/studio.handler.ts` review endpoints to use `studioGenerations`: `GET /review` queries `studioGenerations` where `status = "pending_review"`; `POST /review/approve` triggers `STUDIO_APPROVE_WORKFLOW` (see section 12) and returns `202 { workflowId }` — does NOT do work inline; `POST /review/reject` updates `studioGenerations.status = "rejected"`
- [x] 0.9 Update `apps/web/src/routes/-fn/studio.ts`: update `StudioGeneration` type to match `studioGenerations` shape (remove `topicId`, `vioImageId`, `vioVideoId`; add `topic`)
- [x] 0.10 Update `apps/web/src/routes/(app)/_app/studio/review/-components/review-grid.tsx` and `generation-card.tsx`: use `topic` field instead of `topic.topic` (no more join). Remove any reference to `generationTopics` relation.

## 1. Cleanup — Remove TopicGenerationWorkflow & Old Studio UI

- [x] 1.1 Delete `apps/api/src/workflows/topic-generation.workflow.ts`
- [x] 1.2 Remove `TOPIC_GENERATION_WORKFLOW` Workflow binding from `apps/api/wrangler.toml`
- [x] 1.3 Remove `TOPIC_GENERATION_WORKFLOW: Workflow` from `HonoEnv.Bindings` in `apps/api/src/types/hono.types.ts`
- [x] 1.4 Remove `export { TopicGenerationWorkflow }` from `apps/api/src/index.ts`
- [x] 1.5 Remove the `scheduled` cron handler body from `apps/api/src/index.ts` (the loop that triggered idle topics via `TOPIC_GENERATION_WORKFLOW`)
- [x] 1.6 In `apps/api/src/handlers/studio.handler.ts`: delete Topics CRUD routes (`GET/POST /topics`, `PATCH/DELETE /topics/:id`), delete `POST /topics/:id/trigger`, delete Settings routes (`GET/PUT /settings`). Keep only `GET /review`, `POST /review/approve`, `POST /review/reject`
- [x] 1.7 Delete `apps/web/src/routes/(app)/_app/studio/topics/` — entire directory
- [x] 1.8 Delete `apps/web/src/routes/(app)/_app/studio/settings/` — entire directory
- [x] 1.9 In `apps/web/src/routes/-fn/studio.ts`: delete `getTopicsFn`, `createTopicFn`, `updateTopicFn`, `deleteTopicFn`, `triggerTopicFn`, `getSettingsFn`, `updateSettingsFn`, `studioTopicsQueryOptions`, `studioSettingsQueryOptions`. Keep only review fns and `studioReviewQueryOptions`

## 2. Agent Scaffold & Routing

- [x] 2.1 Add `STUDIO_AGENT` Durable Object namespace to `apps/api/wrangler.toml` with `class_name: "StudioAgent"` and `new_sqlite_classes` migration
- [x] 2.2 Verify `VIO_IMAGE_WORKFLOW` and `VIO_VIDEO_WORKFLOW` are accessible in `CloudflareBindings` (the type used by `AIChatAgent<CloudflareBindings>`). If not declared there, add them to the global `CloudflareBindings` interface or use `this.env as any` with a comment
- [x] 2.3 Create `apps/api/src/agents/studio.agent.ts` — scaffold `StudioAgent extends AIChatAgent<CloudflareBindings>` with empty `onChatMessage`, empty `executeTask`, and the SQLite table init in `onStart`
- [x] 2.4 Add `export { StudioAgent }` to `apps/api/src/index.ts`
- [x] 2.5 Add `/agents/studio-agent/*` route in `apps/api/src/index.ts`: `authMiddleware` → `protect("content.manage")` → `routeAgentRequest(c.req.raw, c.env, { metadata: { userId: user.id } })`. Note: `app.use` permission is NOT required here

## 3. SQLite Flow State

- [x] 3.1 Override `onStart()` in `StudioAgent`. Init the `flow_state` table:
    ```sql
    CREATE TABLE IF NOT EXISTS flow_state (
      id           TEXT PRIMARY KEY,
      steps        TEXT NOT NULL,
      current_step INTEGER NOT NULL DEFAULT 0,
      accumulated  TEXT NOT NULL DEFAULT '{}',
      started_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    )
    ```

## 4. StudioAgent — Step Executor (executeTask)

- [x] 4.1 Implement `executeTask(payload: string, _task: Schedule<string>)`. Parse payload JSON to get `{ flowId }`. Read `flow_state` row by `flowId`. Read `steps[current_step]` and dispatch to step handler. After each step handler that ADVANCES `currentStep`: update `flow_state` (new `current_step`, updated `accumulated`, `updated_at`), broadcast `{ type: "flow_progress", flowId, stepType, stepIndex, totalSteps }`, then schedule next alarm.
- [x] 4.2 Implement `expand_prompt` handler: call `this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", { messages: [{ role: "user", content: buildImagePromptInstruction(topic) }] })`. Write `imagePrompt` to accumulated. Advance step, schedule 0s.
- [x] 4.3 Implement `generate_image` handler: call `await (this.env as any).VIO_IMAGE_WORKFLOW.create({ prompt: accumulated.imagePrompt, model: step.params.model, aspect_ratio: "16:9", count: 1 })`. Write `imageWorkflowId = instance.id` to accumulated. Advance step, schedule 20s.
- [x] 4.4 Implement `wait_image_workflow` handler: `instance = await this.env.VIO_IMAGE_WORKFLOW.get(accumulated.imageWorkflowId)`, `status = await instance.status()`. If `"running"/"queued"` → schedule 15s (do NOT advance step). If `"complete"` → write `imageUrl = status.output[0].asset_url` to accumulated, advance step, schedule 0s. If `"errored"` → call `failFlow(flowId, "wait_image_workflow", status.error)`.
- [x] 4.5 Implement `upload_asset` handler: `const res = await fetch(accumulated.imageUrl)`, `const blob = await res.blob()`, `const asset = await new VioService(this.env.VIO_API_KEY).uploadAsset(blob)`. Write `imageAssetId = asset.asset_id` to accumulated. Advance step, schedule 0s.
- [x] 4.6 Implement `generate_loop_prompt` handler: Workers AI call instructing seamless looping video prompt based on `accumulated.topic` and `accumulated.imageUrl`. Write `loopingPrompt` to accumulated. Advance step, schedule 0s.
- [x] 4.7 Implement `generate_video` handler: resolve `startFrameRef`/`endFrameRef` params — if present, strip `@` prefix and query `user_assets` by alias to get `asset_id`; fall back to `accumulated.imageAssetId` if no ref provided. Build `VioVideoParams` from resolved IDs + `step.params` (mode, model). Call `VIO_VIDEO_WORKFLOW.create(params)`. Write `videoWorkflowId` to accumulated. Advance step, schedule 30s.
- [x] 4.8 Implement `wait_video_workflow` handler: same pattern as `wait_image_workflow`. `status.output` is a single `Generation`. Write `videoUrl = status.output.asset_url`. Advance step, schedule 0s.
- [x] 4.9 Implement `save_result` handler: `db.insert(studioGenerations, { id: generationId, topic, imageUrl, videoUrl, imagePrompt, videoPrompt: accumulated.loopingPrompt ?? null, status: "pending_review", createdAt: new Date() })`. If `accumulated.triggeredBy === "manual"`: append a new assistant message via `this.saveMessages([...this.messages, { role: "assistant", content: [{ type: "text", text: \`Selesai!\\n\\n![${topic}](${imageUrl})\\n\\n...Mau langsung publish?\` }], annotations: [{ type: "generation", generationId }] }])`. `DELETE FROM flow_state WHERE id = flowId`. Broadcast `{ type: "flow_done", topic, imageUrl, videoUrl, mode: accumulated.triggeredBy }`.
- [x] 4.10 Implement `failFlow(flowId, stepType, error)`: `DELETE FROM flow_state WHERE id = flowId`. Broadcast `{ type: "flow_failed", stepType, error }`. No DB row inserted on failure — failed flows produce no result.
- [ ] 4.11 Implement concurrency guard at flow start: `SELECT COUNT(*) FROM flow_state` — if `>= 3`, broadcast `{ type: "flow_skipped" }` and return without inserting.

## 5. StudioAgent — LLM Tools

- [x] 5.1 Implement `runFlowNow` tool: LLM composes `steps: FlowStep[]` based on conversation. Execute: (a) extract image content parts from the message and upload each via `vio.uploadAsset()` into `userAssets = { "image-1": assetId, ... }`; if any upload fails, reply with error and abort; (b) concurrency guard — if `SELECT COUNT(*) FROM flow_state >= 3`, broadcast `flow_skipped`, reply in chat, return; (c) insert `flow_state` row with `accumulated = { topic, triggeredBy: "manual", userAssets? }` and the composed `steps`; (d) schedule `executeTask` alarm 0s. `needsApproval: false`.
- [x] 5.2 Implement `setFlowSchedule` tool: LLM composes `steps`. Execute: `this.schedule(cron, "executeTask", JSON.stringify({ steps, accumulated: { topic, triggeredBy: "schedule" } }))`. `needsApproval: false`.
- [x] 5.3 Implement `listSchedules` tool: `this.getSchedules()` — format with description and next fire time.
- [x] 5.4 Implement `cancelSchedule` tool: `this.cancelSchedule(taskId)`. `needsApproval: true` when description contains "daily" or "every".
- [x] 5.5 Implement `listPendingReviews` tool: `db.query.studioGenerations.findMany({ where: eq(studioGenerations.status, "pending_review"), limit: 10, orderBy: desc(studioGenerations.createdAt) })`.
- [x] 5.6 Implement `getStats` tool: `{ activeSchedules: this.getSchedules().length, inFlightFlows: sql count from flow_state, pendingReviews: db count }`.
- [x] 5.7 Implement `approveGeneration` tool (params: `generationId`, `scheduledAt?`): read `studioGenerations` row, verify exists + `status === "pending_review"`. Trigger workflow with deterministic ID: `try { await this.env.STUDIO_APPROVE_WORKFLOW.create({ id: \`approve-${generationId}\`, params: { generationId, userId: this.name, scheduledAt } }) } catch { /_ already in flight _/ }`. Broadcast `{ type: "approve_started", generationId }`. Reply: "Memproses approval — akan ada notifikasi saat selesai". `needsApproval: false`.
- [x] 5.8 Implement `onApproveDone(payload)` DO RPC method (NOT an LLM tool — called by workflow): `this.saveMessages([...this.messages, { role: "assistant", content: [{ type: "text", text: \`Post created sebagai draft (${type}).\\n\\n[Buka post →](/posts/${postId})\` }] }])`. Then `this.broadcast({ type: "approve_done", generationId, postId, type })`.
- [x] 5.9 Implement `onApproveFailed(payload)` DO RPC method: revert `studioGenerations.status = "pending_review"` so admin can retry. Broadcast `{ type: "approve_failed", generationId, step, error }`. Save assistant message: `"Gagal approve di step '${step}': ${error}. Coba lagi?"`.

## 6. StudioAgent — System Prompt & onChatMessage

- [x] 6.1 Write system prompt in `onChatMessage` including: role description, available image model catalog (name + description + speed), available video model catalog, flow composition rules (never call tools without model specified, always present options), current stats (from `getStats()`), today's date.
- [x] 6.2 In `onChatMessage`, detect image attachments in the latest user message. If present, append a system note to the LLM context: `"User attached N image(s) — reference them as @image-1, @image-2, ... in startFrameRef/endFrameRef when composing generate_video steps."`. This is needed because the orchestrator LLM (Workers AI llama-3.3) is text-only and cannot see images directly.
- [x] 6.3 Wire `streamText` in `onChatMessage` with all tools from tasks 5.x. Use `stopWhen: stepCountIs(10)`.

## 7. StudioAgent — On-Connect Broadcast

- [x] 7.1 Override `onConnect(connection)` in `StudioAgent`: call `getStats()` logic, send `{ type: "stats", ...stats }` to the new connection immediately.

## 8. Web — /studio/agent Route (assistant-ui)

- [x] 8.1 In `apps/web`: `pnpm add @assistant-ui/react @assistant-ui/react-ai-sdk`. Run `npx assistant-ui@latest init` to scaffold `src/components/assistant-ui/thread.tsx`. (Skipped assistant-ui scaffold due to Tailwind v4 incompatibility, implemented custom minimal chat instead).
- [x] 8.2 Create `apps/web/src/routes/(app)/_app/studio/agent/index.tsx`. `beforeLoad`: `Gate.can("content.manage", { actor: session.user })` — redirect to `/feed` if denied. `loader`: return `{ userId: session.user.id }`.
- [x] 8.3 Implement page component: `useAgent({ agent: "studio-agent", name: userId, host: VITE_API_URL, prefix: "agents", onMessage })` → `useAgentChat({ agent, credentials: "include" })` → custom UI implementation.
- [x] 8.4 In `onMessage`: `flow_done` → `toast.success("Generation complete: " + data.topic)` + `queryClient.invalidateQueries({ queryKey: ["studio-review"] })`; `flow_skipped` → `toast.warning(...)`; `flow_failed` → `toast.error(...)`; `stats` → `setStats(data)`.
- [x] 8.5 Customize `Thread` component: implemented custom mapping of chat messages and suggestions.
- [x] 8.6 Create `apps/web/src/routes/(app)/_app/studio/agent/-components/studio-agent-header.tsx`: shows active schedule count, in-flight flows, pending reviews. Receives `stats` as props. Includes link to `/studio/review`.
- [x] 8.7 Extend `onMessage` to handle the full event set: `flow_progress` → optional inline progress indicator; `approve_started` → toast.info("Memproses approval..."); `approve_done` → toast.success("Post created") + invalidate `["studio-review"]` + invalidate `["posts"]`; `approve_failed` → toast.error with step + error info.

## 9. Navigation Cleanup

- [x] 9.1 Update `/studio/review/index.tsx`: remove link to `/studio/topics`, add link to `/studio/agent`.
- [x] 9.2 Update any studio layout or sidebar nav to remove `/studio/topics` and `/studio/settings` links, add `/studio/agent`.

## 10. Image Attachment in Chat

- [x] 10.1 Implement `AttachmentAdapter` in `apps/web/src/routes/(app)/_app/studio/agent/index.tsx`: Since we use custom UI, added hidden file input, preview image UI, and file reading logic.
- [x] 10.2 The actual Vio asset upload happens inside `runFlowNow` tool execution (see task 5.1).
- [x] 10.3 Update `runFlowNow` tool schema: `generate_video` step params include optional `startFrameRef?: string` and `endFrameRef?: string` (e.g. `"@image-1"`). System prompt update is covered by task 6.2.

## 12. StudioApproveWorkflow

- [x] 12.1 Create `apps/api/src/workflows/studio-approve.workflow.ts`: `StudioApproveWorkflow extends WorkflowEntrypoint<CloudflareBindings, { generationId: string; userId: string; scheduledAt?: string }>`.
- [x] 12.2 Implement step `"lock"`: atomic `UPDATE studioGenerations SET status = "processing" WHERE id = ? AND status = "pending_review" RETURNING *`. If `updated.length === 0` → return `{ skipped: true }` and the workflow short-circuits (no other steps run).
- [x] 12.3 Implement step `"upload-video"`: if `row.videoUrl` exists, `fetch(row.videoUrl)` → `STORAGE.put(\`posts/video/${generationId}.mp4\`, res.body)`and return the key. Else return`null`.
- [x] 12.4 Implement step `"upload-thumbnail"`: if `row.imageUrl` exists, `fetch(row.imageUrl)` → `STORAGE.put(\`posts/thumbnail/${generationId}.jpg\`, res.body)`and return the key. Else return`null`.
- [x] 12.5 Implement step `"create-post"`: `db.transaction` — `INSERT posts { id: postId, status: "draft", type: videoFileKey ? "video" : "image", scheduledAt }` + `INSERT postMetadata { postId, imageUrl: row.imageUrl, fileKey: videoFileKey, thumbnailKey }` + `UPDATE studioGenerations SET status = "approved", postId WHERE id = generationId`. Return `postId`.
- [x] 12.6 Implement step `"trigger-video-processing"`: if `videoFileKey` is set, `await this.env.VIDEO_PROCESSING_WORKFLOW.create({ params: { postId, fileKey: videoFileKey } })`. Image-only approvals skip this step.
- [x] 12.7 Implement step `"notify-agent"`: `const stub = this.env.STUDIO_AGENT.get(this.env.STUDIO_AGENT.idFromName(userId))`; `await stub.onApproveDone({ generationId, postId, type })`.
- [x] 12.8 Wrap the workflow body in try/catch: on any uncaught error from step.do(), call `stub.onApproveFailed({ generationId, step: currentStepName, error: err.message })` before re-throwing so Workflows marks the run as errored.
- [x] 12.9 Add `STUDIO_APPROVE_WORKFLOW` Workflow binding to `apps/api/wrangler.toml` with `class_name: "StudioApproveWorkflow"`.
- [x] 12.10 Add `STUDIO_APPROVE_WORKFLOW: Workflow` to `CloudflareBindings` interface (or HonoEnv.Bindings if accessed from REST handler).
- [x] 12.11 Add `export { StudioApproveWorkflow }` to `apps/api/src/index.ts`.
- [x] 12.12 Update `POST /api/v1/studio/review/approve` in `studio.handler.ts`: replace inline logic with workflow trigger — `try { await c.env.STUDIO_APPROVE_WORKFLOW.create({ id: \`approve-${generationId}\`, params: { generationId, userId: c.get("user").id, scheduledAt } }) } catch { /_ already in flight _/ }`. Return `ApiResponse.ok(c, "Approval queued", { workflowId })` with 202 status if possible.

## 11. Verification

- [ ] 11.1 `grep -r "TopicGenerationWorkflow" apps/ packages/` — zero results
- [ ] 11.2 `grep -r "TOPIC_GENERATION_WORKFLOW" apps/ packages/` — zero results
- [ ] 11.3 `grep -r "topicGenerations\|generationTopics\|generationSettings" apps/ packages/` — zero results
- [ ] 11.4 Manual: open `/studio/agent`, say "generate lofi background" without specifying model — verify agent presents model options before executing
- [ ] 11.5 Manual: select model, confirm — verify `flow_state` row created, alarms fire, `VioImageWorkflow` triggered, `flow_progress` broadcast per step
- [ ] 11.6 Manual: flow completes (manual) → verify `studioGenerations` row with `status: "pending_review"` + assistant message appended with inline image + `flow_done` broadcast + review grid auto-refreshes
- [ ] 11.7 Manual: in the same chat turn, reply "approve" → verify agent triggers `STUDIO_APPROVE_WORKFLOW` (check `wrangler tail` or workflow dashboard), replies immediately with "Memproses...", broadcast `approve_started`. After workflow completes: `studioGenerations.status = "approved"`, `posts` row exists, agent appends "Post created" message, broadcast `approve_done`, review grid refreshes.
- [ ] 11.8 Manual: approve an image-only generation → verify `upload-video` step returns null (skipped), `upload-thumbnail` runs, post created with `type: "image"`, NO `VIDEO_PROCESSING_WORKFLOW` trigger.
- [ ] 11.18 Manual: trigger `approveGeneration` twice in quick succession for the same `generationId` → verify the second call catches the "instance already exists" error gracefully, NO duplicate post is created, only ONE `approve_done` is broadcast.
- [ ] 11.19 Manual: trigger approve from REST endpoint and agent simultaneously → verify atomic lock prevents duplicate (one workflow exits with `skipped: true`), only one post created.
- [ ] 11.20 Manual: simulate workflow failure (e.g. invalid videoUrl) → verify `onApproveFailed` runs, `studioGenerations.status` reverts to `"pending_review"`, broadcast `approve_failed`, agent posts retry message in chat.
- [ ] 11.9 Manual: set a cron schedule, close browser, wait for next fire, reopen — verify generation ran autonomously, `triggeredBy: "schedule"`, no inline message appended
- [ ] 11.10 Manual: `/studio/review` approve and reject endpoints still work for legacy/backup access
- [ ] 11.11 Manual: trigger 4 flows simultaneously — 4th is skipped with `flow_skipped` broadcast + chat reply explaining the limit
- [ ] 11.12 Manual: trigger a flow that fails (e.g. invalid model) → verify NO `studioGenerations` row inserted, `flow_failed` broadcast, `flow_state` cleaned up
- [ ] 11.13 Manual: paste an image in the composer → verify thumbnail preview appears labeled "image-1", no network request sent until message is submitted
- [ ] 11.14 Manual: attach 2 images, type "generate video @image-1 start @image-2 end pake kling-v3 i2v-fl" → verify agent injects attachment hint, uploads both to Vio at flow start, `accumulated.userAssets` has both entries, `VIO_VIDEO_WORKFLOW` receives correct `start_frame_asset_id` and `end_frame_asset_id`
- [ ] 11.15 Manual: simulate Vio upload failure for attachment → verify NO `flow_state` row inserted, agent replies with error message in chat
- [ ] 11.16 Manual: send message without attachment for i2v-fl flow → verify `generate_video` falls back to `accumulated.imageAssetId` from `upload_asset` step
- [ ] 11.17 `pnpm typecheck` — no errors
