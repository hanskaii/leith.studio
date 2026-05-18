import { PolicyError } from "@workspace/core";

export class ServerError extends Error {
	constructor(
		message: string,
		public readonly code: string = "INTERNAL_ERROR",
		public readonly status: number = 500
	) {
		super(message);
		this.name = "ServerError";
	}
}

/**
 * Wraps an async function and normalizes errors into ServerError.
 * Use inside createServerFn handlers to get consistent error behavior.
 *
 * @example
 * export const myFn = createServerFn({ method: "GET" }).handler(() =>
 *   handleError(async () => {
 *     await Gate.assert("billing.manage", ctx)
 *     return await fetchData()
 *   })
 * )
 */
export async function handleError<T>(fn: () => Promise<T>): Promise<T> {
	try {
		return await fn();
	} catch (err) {
		if (err instanceof ServerError) throw err;

		if (err instanceof PolicyError) {
			throw new ServerError(err.message, err.code, 403);
		}

		const message =
			err instanceof Error ? err.message : "Something went wrong";
		throw new ServerError(message, "INTERNAL_ERROR", 500);
	}
}
