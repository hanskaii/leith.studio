import { getAuth, type Auth } from "@workspace/auth";

export class AuthService {
	public auth: Auth;

	constructor(env: any) {
		this.auth = getAuth(env);
	}

	/**
	 * Get the current session from headers.
	 */
	async getSession(headers: Headers) {
		return await this.auth.api.getSession({
			headers: headers
		});
	}

	/**
	 * Helper to get user and session in one go.
	 */
	async resolve(headers: Headers) {
		const session = await this.getSession(headers);
		return {
			user: session?.user ?? null,
			session: session?.session ?? null
		};
	}
}
