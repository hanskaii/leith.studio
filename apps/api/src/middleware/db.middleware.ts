import { createMiddleware } from "hono/factory";
import { database } from "@workspace/database";
import type { HonoEnv } from "../types/hono.types";

export const dbMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
	c.set("db", database(c.env.DATABASE));
	await next();
});
