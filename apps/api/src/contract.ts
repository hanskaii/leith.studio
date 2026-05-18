import { Hono } from "hono";
import type { HonoEnv } from "./types/hono.types";
import uploadHandler from "./handlers/upload.handler";
import postsHandler from "./handlers/posts.handler";
import creatorHandler from "./handlers/creator.handler";
import licenseHandler from "./handlers/license.handler";

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
 */
const contract = new Hono<HonoEnv>()
	.route("/api/upload", uploadHandler)
	.route("/api/v1/posts", postsHandler)
	.route("/api/v1/creator", creatorHandler)
	.route("/api/v1/license", licenseHandler);

export type AppType = typeof contract;
export { contract };
