import { PolicyRegistry } from "./registry";
import { allow } from "./policy";
import type { PolicyResult, GateEvents, GateActions } from "./types";

export class PolicyError extends Error {
	public readonly code: string;
	public readonly statusCode = 403;

	constructor(message: string, code = "FORBIDDEN") {
		super(message);
		this.name = "PolicyError";
		this.code = code;
	}
}

export class Gate {
	private static registries = new Map<string, PolicyRegistry<any>>();
	private static hooks = new Map<string, Array<(ctx: any) => void>>();
	private static beforeHooks: Array<
		(action: any, ctx: any) => Promise<PolicyResult | void>
	> = [];

	private static register(action: string, registry: PolicyRegistry<any>) {
		this.registries.set(action, registry);
	}

	private static policy(
		policyObject: Record<string, { action: string; fn: any }>
	) {
		for (const item of Object.values(policyObject)) {
			const registry =
				this.registries.get(item.action) || new PolicyRegistry<any>();
			registry.registerPolicy(item.fn);
			this.register(item.action, registry);
		}
	}

	/**
	 * Register a global interceptor that runs before any policy check.
	 */
	static before(
		fn: <K extends keyof GateActions>(
			action: K,
			ctx: GateActions[K]
		) => Promise<PolicyResult | void>
	) {
		this.beforeHooks.push(fn as any);
	}

	/**
	 * Register one or more policy maps.
	 * Usage: Gate.policies({ user: UserPolicy, billing: BillingPolicy })
	 */
	static policies(policyMaps: Record<string, any>) {
		for (const policyObject of Object.values(policyMaps)) {
			this.policy(policyObject);
		}
	}

	/**
	 * Check if the given action is allowed for the provided context.
	 * Returns a PolicyResult — use Gate.assert() if you want to throw on denial.
	 */
	static async can<K extends keyof GateActions>(
		action: K | (string & {}),
		ctx: K extends keyof GateActions ? GateActions[K] : any
	): Promise<PolicyResult> {
		for (const hook of this.beforeHooks) {
			const result = await hook(action as any, ctx);
			if (result) return result;
		}

		const registry = this.registries.get(action);
		if (!registry) {
			return allow();
		}
		return await registry.runAll(ctx);
	}

	/**
	 * Assert that the given action is allowed — throws PolicyError if denied.
	 * Use in route handlers for clean, throw-based control flow.
	 *
	 * @example
	 * await Gate.assert("billing.manage", { userId, role })
	 * // continues if allowed, throws 403 PolicyError if denied
	 */
	static async assert<K extends keyof GateActions>(
		action: K | (string & {}),
		ctx: K extends keyof GateActions ? GateActions[K] : any
	): Promise<void> {
		const result = await this.can(action, ctx);
		if (!result.allowed) {
			throw new PolicyError(
				result.message ??
					"You do not have permission to perform this action.",
				result.code ?? "FORBIDDEN"
			);
		}
	}

	/**
	 * Register a hook to run after a successful action or event.
	 */
	static after<E extends keyof GateEvents>(
		event: E | (string & {}),
		fn: (
			ctx: E extends keyof GateEvents ? GateEvents[E] : any
		) => void | Promise<void>
	) {
		const existing = this.hooks.get(event) || [];
		existing.push(fn);
		this.hooks.set(event, existing);
	}

	/**
	 * Emit an event to trigger all registered 'after' hooks.
	 */
	static async emit<E extends keyof GateEvents>(
		event: E | (string & {}),
		ctx: E extends keyof GateEvents ? GateEvents[E] : any
	): Promise<void> {
		const hooks = this.hooks.get(event) || [];
		await Promise.allSettled(hooks.map((h) => Promise.resolve(h(ctx))));
	}
}
