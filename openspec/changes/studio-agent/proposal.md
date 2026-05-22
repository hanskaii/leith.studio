## Why

The studio is entirely manual: admins fill forms to create topics, click trigger to start a workflow, then wait and refresh to review results. The `TopicGenerationWorkflow` orchestrates a fixed pipeline with no AI reasoning between steps and cannot schedule itself. This change replaces the manual studio pipeline with a Cloudflare Agents SDK-powered `StudioAgent` that understands natural language, composes dynamic generation flows at runtime, and schedules itself autonomously — admins describe what they want and leave.

## What Changes

- **REMOVE** `apps/api/src/workflows/topic-generation.workflow.ts` — the old fixed orchestrator, replaced by the agent's dynamic step executor
- **REMOVE** `TOPIC_GENERATION_WORKFLOW` Workflow binding from `wrangler.toml` and `HonoEnv`
- **REMOVE** `apps/web/src/routes/(app)/_app/studio/topics/` — entire route and components
- **REMOVE** `apps/web/src/routes/(app)/_app/studio/settings/` — entire route and components
- **REMOVE** Topics, Settings, and trigger endpoints from `apps/api/src/handlers/studio.handler.ts`
- **REMOVE** topics CRUD + settings + trigger server functions from `apps/web/src/routes/-fn/studio.ts`
- **KEEP** `VioImageWorkflow`, `VioVideoWorkflow`, `VioUpscaleWorkflow`, `VioMotionControlWorkflow` — still used by the agent as durable step executors
- **ADD** `StudioAgent` class in `apps/api/src/agents/studio.agent.ts` — `AIChatAgent` with dynamic step-based flow engine and autonomous scheduling
- **ADD** `StudioApproveWorkflow` in `apps/api/src/workflows/studio-approve.workflow.ts` — durable workflow for the approve/publish path (atomic status lock + R2 uploads + post creation + handoff to existing `VIDEO_PROCESSING_WORKFLOW`). Triggered from both the agent tool and the REST review endpoint with shared logic.
- **ADD** `STUDIO_AGENT` Durable Object namespace binding in `wrangler.toml`
- **ADD** `STUDIO_APPROVE_WORKFLOW` Workflow binding in `wrangler.toml`
- **ADD** `/agents/studio-agent/*` route in `apps/api/src/index.ts` — protected by `content.manage` only (no `app.use`)
- **ADD** `apps/web/src/routes/(app)/_app/studio/agent/` — dedicated studio agent page using assistant-ui
- **KEEP** `apps/web/src/routes/(app)/_app/studio/review/` — visual review grid, approve/reject intact
- **KEEP** Review endpoints in `studio.handler.ts` (`GET /review`, `POST /review/approve`, `POST /review/reject`) — updated to read/write `studio_generations`

### Database

- **REMOVE** `packages/database/schema/generation-topics.ts` — `generationTopics` table (parent topic entity, no longer needed)
- **REMOVE** `packages/database/schema/topic-generations.ts` — `topicGenerations` table (tied to old workflow system)
- **REMOVE** `packages/database/schema/generation-settings.ts` — `generationSettings` table (global defaults, managed by agent conversation instead)
- **ADD** `packages/database/schema/studio-generations.ts` — `studioGenerations` table: flat, one row per generation result produced by the agent; replaces all three removed tables. Status enum: `"pending_review" | "processing" | "approved" | "rejected"` — the `"processing"` value is used as an atomic DB-level lock during the approve workflow to prevent race conditions.
- **KEEP** `posts`, `postMetadata`, `postStats` — unchanged; approve flow still creates a post row

## Capabilities

### New Capabilities

- `studio-agent`: Durable Object agent with natural language control, autonomous cron scheduling, and a dynamic step-based flow engine. The agent composes a step sequence (expand prompt → generate image via VioImageWorkflow → upload asset → generate loop prompt → generate video via VioVideoWorkflow → save) at runtime based on user intent. Clarifies missing parameters (model selection) before executing. Broadcasts real-time progress to the UI.

### Removed Capabilities

- `topic-generation-workflow`: Fixed Cloudflare Workflow orchestrator — replaced by the agent's dynamic step executor. The individual Vio Workflows it called directly are now triggered by the agent instead.
- `studio-topics-ui`: Manual topic CRUD form — replaced by agent natural language.
- `studio-settings-ui`: Manual settings form — managed via agent conversation.

### Unchanged Capabilities

- `content-review`: Visual review grid at `/studio/review` — approve/reject generated results. The agent writes to the new `studioGenerations` table the review grid reads from.
- `vio-workflows`: `VioImageWorkflow` and `VioVideoWorkflow` remain as durable primitives. The agent triggers them per step and polls their completion status.

## Impact

- `apps/api/src/agents/studio.agent.ts` — new file, `StudioAgent extends AIChatAgent<CloudflareBindings>`
- `apps/api/src/index.ts` — add `/agents/studio-agent/*` route, export `StudioAgent`, remove `TopicGenerationWorkflow` export
- `apps/api/src/handlers/studio.handler.ts` — remove topics CRUD + settings CRUD + trigger endpoint; keep review endpoints
- `apps/api/src/types/hono.types.ts` — remove `TOPIC_GENERATION_WORKFLOW: Workflow` from Bindings
- `apps/api/wrangler.toml` — remove `TOPIC_GENERATION_WORKFLOW` binding, add `STUDIO_AGENT` DO namespace
- `apps/web/src/routes/(app)/_app/studio/topics/` — delete entire directory
- `apps/web/src/routes/(app)/_app/studio/settings/` — delete entire directory
- `apps/web/src/routes/(app)/_app/studio/agent/` — new directory with assistant-ui page
- `apps/web/src/routes/-fn/studio.ts` — remove topics + settings + trigger fns; keep review fns
- `packages/database/schema/studio-generations.ts` — new file, `studioGenerations` table
- `packages/database/schema/generation-topics.ts` — deleted
- `packages/database/schema/topic-generations.ts` — deleted
- `packages/database/schema/generation-settings.ts` — deleted
- `packages/database/schema/index.ts` — remove old exports, add `studioGenerations` export
- Migration: drop three old tables, create `studio_generations`
