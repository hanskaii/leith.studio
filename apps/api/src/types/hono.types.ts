import { type DatabaseInstance } from "@workspace/database";
import type { User, Session } from "@workspace/auth";

export interface HonoEnv {
	Bindings: CloudflareBindings & {
		VIDEO_PROCESSING_WORKFLOW: Workflow;
		MEDIA_CONTAINER: DurableObjectNamespace;
	};
	Variables: {
		user: User;
		session: Session;
		db: DatabaseInstance;
	};
}
