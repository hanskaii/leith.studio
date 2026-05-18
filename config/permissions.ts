import { allow, deny } from "@workspace/core";
import type { BasePolicyContext, PolicyResult } from "@workspace/core";

/**
 * Static permission map — the single source of truth for role capabilities.
 * Format: "resource:action" (e.g. "billing:manage")
 * Add new roles here; policies stay untouched.
 */
export const ROLE_PERMISSIONS = {
	admin: [
		"app:use",
		"account:delete",
		"billing:manage",
		"admin:access",
		"api-keys:manage",
		"profile:update",
		"security:manage",
		"agents:manage",
		"agents:chat"
	],
	user: [
		"app:use",
		"account:delete",
		"billing:manage",
		"api-keys:manage",
		"profile:update",
		"security:manage",
		"agents:chat"
	]
} as const;

export type Permission =
	(typeof ROLE_PERMISSIONS)[keyof typeof ROLE_PERMISSIONS][number];

/**
 * Sync permission lookup — for UI hints only (show/hide elements).
 * Real enforcement must always go through Gate.assert() / Gate.can().
 *
 * @example
 * hasPermission(user?.role, "admin:access") // → boolean
 */
export function hasPermission(
	role: string | null | undefined,
	permission: Permission
): boolean {
	if (!role || !(role in ROLE_PERMISSIONS)) return false;
	return (
		ROLE_PERMISSIONS[
			role as keyof typeof ROLE_PERMISSIONS
		] as readonly string[]
	).includes(permission);
}

/**
 * Policy helper — use inside definePolicy via combine().
 * Checks whether the actor's role has the given permission.
 *
 * @example
 * definePolicy("billing.manage", authorize("billing:manage"))
 */
export function authorize(
	permission: Permission | (string & {})
): (ctx: BasePolicyContext) => PolicyResult {
	return (ctx) => {
		const role = ctx.actor.role as
			| keyof typeof ROLE_PERMISSIONS
			| undefined;
		const perms: readonly string[] =
			role && role in ROLE_PERMISSIONS ? ROLE_PERMISSIONS[role] : [];

		if (!perms.includes(permission)) {
			return deny({
				code: "INSUFFICIENT_PERMISSIONS",
				message: `This action requires the '${permission}' permission.`
			});
		}

		return allow();
	};
}
