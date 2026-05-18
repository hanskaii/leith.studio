import type { PolicyResult } from "./types";

export class PolicyRegistry<T> {
	private policies: Array<(ctx: T) => Promise<PolicyResult>> = [];

	registerPolicy(fn: (ctx: T) => Promise<PolicyResult>) {
		this.policies.push(fn);
	}

	async runAll(ctx: T): Promise<PolicyResult> {
		for (const policy of this.policies) {
			const result = await policy(ctx);
			if (!result.allowed) {
				return result;
			}
		}
		return { allowed: true };
	}
}
