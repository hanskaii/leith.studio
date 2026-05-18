import { createMiddleware } from "hono/factory";
import { Gate } from "@workspace/core";
import { ApiError } from "../helpers/errors.helper";
import type { GateActions } from "@workspace/core";
import type { HonoEnv } from "../types/hono.types";

/**
 * Route-level Gate guard. Must run after authMiddleware.
 *
 * Thin wrapper over Gate.assert() — throws PolicyError (caught by onError → 403)
 * if the policy denies access. Admin bypass is handled globally in Gate.before().
 *
 * @example
 * // Single Gate action
 * .get("/admin", authMiddleware, protect("admin.access"), handler)
 *
 * // Subscription gate
 * .get("/dashboard", authMiddleware, protect("app.use"), handler)
 */
export const protect = (action: keyof GateActions | (string & {})) =>
	createMiddleware<HonoEnv>(async (c, next) => {
		const user = c.get("user");
		if (!user) throw ApiError.unauthorized();

		await Gate.assert(action, { actor: user });

		await next();
	});
