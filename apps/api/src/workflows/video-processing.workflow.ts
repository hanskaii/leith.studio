import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import type { HonoEnv } from "../types/hono.types";

type Env = HonoEnv["Bindings"];

export type VideoProcessingParams = {
	postId: string;
	slug: string;
	fileKey: string;
	format: string;
};

// DORMANT — this workflow is kept in the repo and registered with Wrangler
// but no longer triggered by any handler or workflow. Preview/clip generation
// is deferred until on-the-fly optimisation is reintroduced; until then the
// feed and detail pages serve the original asset directly.
//
// To re-enable: restore the original processing steps and re-introduce the
// `preview` / `clip` roles in `post_assets` (and the corresponding writers
// in `creator.handler.ts` and `studio-approve.workflow.ts`).
export class VideoProcessingWorkflow extends WorkflowEntrypoint<
	Env,
	VideoProcessingParams
> {
	async run(
		_event: WorkflowEvent<VideoProcessingParams>,
		_step: WorkflowStep
	) {
		// No-op. See banner comment above.
	}
}
