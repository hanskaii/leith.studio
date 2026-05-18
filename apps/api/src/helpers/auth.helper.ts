import { AuthService } from "../services/auth.service";
import { ApiError } from "./errors.helper";

/**
 * Resolve the current session user from request headers.
 * Throws ApiError.unauthorized() if no valid session.
 */
export async function requireAuth(c: {
	env: CloudflareBindings;
	req: { raw: Request };
}) {
	const authService = new AuthService(c.env);
	const session = await authService.auth.api.getSession({
		headers: c.req.raw.headers
	});
	if (!session?.user) throw ApiError.unauthorized();
	return session.user;
}

/**
 * Optionally resolve the current session — returns null if not authenticated.
 * Does NOT throw. Use this for endpoints with mixed auth (public + authenticated).
 */
export async function optionalAuth(c: {
	env: CloudflareBindings;
	req: { raw: Request };
}) {
	const authService = new AuthService(c.env);
	const session = await authService.auth.api.getSession({
		headers: c.req.raw.headers
	});
	return session?.user ?? null;
}
