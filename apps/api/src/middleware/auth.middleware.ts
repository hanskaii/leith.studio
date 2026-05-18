import { createMiddleware } from "hono/factory";
import { AuthService } from "../services/auth.service";
import { ApiError } from "../helpers/errors.helper";
import { database } from "@workspace/database";
import type { User, Session } from "@workspace/auth";
import type { HonoEnv } from "../types/hono.types";

export const authMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
	const authService = new AuthService(c.env);
	const { user, session } = await authService.resolve(c.req.raw.headers);

	if (!session) {
		throw ApiError.unauthorized();
	}

	c.set("user", user as User);
	c.set("session", session as Session);
	c.set("db", database(c.env.DATABASE));

	await next();
});
