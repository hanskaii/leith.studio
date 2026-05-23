import { createMiddleware } from "@tanstack/react-start";
import { getSessionFn } from "@/routes/-fn/auth";

export const authMiddleware = createMiddleware().server(async ({ next }) => {
	const session = await getSessionFn();

	return next({ context: { session } });
});
