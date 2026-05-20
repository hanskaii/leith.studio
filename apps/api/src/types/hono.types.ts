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
	};
	Variables: {
		user: User;
		session: Session;
		db: DatabaseInstance;
	};
}
