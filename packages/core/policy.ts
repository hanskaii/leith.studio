import type { PolicyResult } from "./types";

export function allow(): PolicyResult {
	return { allowed: true };
}

export function deny(options?: {
	code?: string;
	message?: string;
}): PolicyResult {
	return {
		allowed: false,
		code: options?.code ?? "FORBIDDEN",
		message:
			options?.message ??
			"You do not have permission to perform this action"
	};
}

export function combine<T>(
	...handlers: Array<(ctx: T) => Promise<PolicyResult> | PolicyResult>
) {
	return async (ctx: T) => {
		for (const handler of handlers) {
			const result = await handler(ctx);
			if (!result.allowed) return result;
		}
		return allow();
	};
}

/**
 * Define a policy for a specific action.
 * Pass the context type as the generic: definePolicy<MyContext, "action.name">("action.name", fn)
 */
export function definePolicy<Ctx = any, A extends string = string>(
	action: A,
	fn: (ctx: Ctx) => Promise<PolicyResult> | PolicyResult
): { action: A; fn: (ctx: Ctx) => Promise<PolicyResult> | PolicyResult } {
	return { action, fn };
}

export function requiresSubscription() {
	return (ctx: {
		actor?: { subscriptionStatus?: string | null };
	}): PolicyResult => {
		const status = ctx.actor?.subscriptionStatus;
		if (status === "active" || status === "lifetime") return allow();
		return deny({
			code: "SUBSCRIPTION_REQUIRED",
			message: "Upgrade to Pro to use this feature."
		});
	};
}
