import { type Context } from "hono";
import { ApiError } from "./errors.helper";

export const notFoundHandler = (c: Context) => {
	throw ApiError.notFound(`Route ${c.req.method} ${c.req.path} not found`);
};
