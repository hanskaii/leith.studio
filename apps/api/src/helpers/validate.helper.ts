import type { Context } from "hono";
import type { z } from "zod";
import { ApiError } from "./errors.helper";

/**
 * Parse and validate the JSON body of a Hono request against a Zod schema.
 * Throws ApiError.badRequest with a user-friendly message on failure.
 */
export async function validateBody<T extends z.ZodType>(
	c: Context,
	schema: T
): Promise<z.infer<T>> {
	const body = await c.req.json().catch(() => null);
	if (body === null) {
		throw ApiError.badRequest("Invalid or missing JSON body");
	}

	const result = schema.safeParse(body);
	if (!result.success) {
		const issues = result.error.issues
			.map((i: any) => `${i.path.join(".")}: ${i.message}`)
			.join("; ");
		throw ApiError.badRequest(`Validation error: ${issues}`);
	}

	return result.data;
}

/**
 * Parse and validate query parameters against a Zod schema.
 */
export function validateQuery<T extends z.ZodType>(
	c: Context,
	schema: T
): z.infer<T> {
	const query = c.req.query();
	const result = schema.safeParse(query);
	if (!result.success) {
		const issues = result.error.issues
			.map((i: any) => `${i.path.join(".")}: ${i.message}`)
			.join("; ");
		throw ApiError.badRequest(`Validation error: ${issues}`);
	}
	return result.data;
}
