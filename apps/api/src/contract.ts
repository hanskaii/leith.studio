import { Hono } from "hono";
import type { HonoEnv } from "./types/hono.types";
import uploadHandler from "./handlers/upload.handler";
import { authMiddleware } from "./middleware/auth.middleware";
import { protect } from "./middleware/protect.middleware";

/**
 * Typed RPC contract for Hono client (`hc<AppType>`).
 *
 * Rules for adding routes:
 * 1. Handler must use method chaining (not imperative calls)
 * 2. Use `zValidator` for typed input
 * 3. Return `c.json(...)` directly for typed output
 *
 * Routes NOT included here:
 * - better-auth routes (/api/auth/*) — not Hono-defined
 * - agent routes — CF Durable Object specific
 *
 * All contract routes are gated behind authMiddleware + protect("app.use").
 *
 * @example Adding a new typed route:
 * import { uploadHandler } from "./handlers/upload.handler"
 * const contract = new Hono<HonoEnv>()
 *   .use("*", authMiddleware, protect("app.use"))
 *   .route("/api/upload", uploadHandler)
 *   .route("/profile", profileHandler)  // ← add here
 */
const contract = new Hono<HonoEnv>()
	.use("*", authMiddleware, protect("app.use"))
	.route("/api/upload", uploadHandler);

export type AppType = typeof contract;
export { contract };
