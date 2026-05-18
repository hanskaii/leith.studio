import { type DatabaseInstance } from "@workspace/database";
import type { User, Session } from "@workspace/auth";

export interface HonoEnv {
	Bindings: CloudflareBindings;
	Variables: {
		user: User;
		session: Session;
		db: DatabaseInstance;
	};
}
