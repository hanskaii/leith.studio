import { type DatabaseInstance } from "@workspace/database";
import type { User, Session } from "@workspace/auth";

export interface HonoEnv {
	Bindings: CloudflareBindings & {
		VIDEO_PROCESSING_WORKFLOW: Workflow;
		MEDIA_CONTAINER: DurableObjectNamespace;
		VIO_IMAGE_WORKFLOW: Workflow;
		VIO_VIDEO_WORKFLOW: Workflow;
		VIO_UPSCALE_WORKFLOW: Workflow;
		VIO_MOTION_CONTROL_WORKFLOW: Workflow;
		STUDIO_APPROVE_WORKFLOW: Workflow;
		AI_ENRICH_WORKFLOW: Workflow;
		STUDIO_AGENT: DurableObjectNamespace;
		VIO_API_KEY: string;
		APP_ENV: string;
		DODO_PAYMENTS_API_KEY: string;
		DATABASE: D1Database;
		// Cloudflare AI Search binding. Typed as `unknown` here because the
		// runtime SDK shape isn't fully reflected in @cloudflare/workers-types
		// yet — the `SearchService` in services/search.service.ts narrows it
		// defensively at call time.
		AI_SEARCH: unknown;
		STORAGE: R2Bucket;
	};
	Variables: {
		user: User;
		session: Session;
		db: DatabaseInstance;
	};
}
