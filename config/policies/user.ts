import { authorize } from "../permissions";
import {
	definePolicy,
	deny,
	allow,
	combine,
	requiresSubscription
} from "@workspace/core";
import type { BasePolicyContext } from "@workspace/core";

export interface AccountDeleteContext extends BasePolicyContext {
	resource?: {
		createdAt?: string | Date;
	};
}

export const UserPolicy = {
	accessAdmin: definePolicy<BasePolicyContext, "admin.access">(
		"admin.access",
		authorize("admin:access")
	),

	deleteAccountGracePeriod: definePolicy<
		AccountDeleteContext,
		"account.delete.grace-period"
	>(
		"account.delete.grace-period",
		combine<AccountDeleteContext>(authorize("account:delete"), (ctx) => {
			const createdAt = ctx.resource?.createdAt;

			if (!createdAt) {
				return deny({
					code: "INSUFFICIENT_DATA",
					message: "Unable to verify account creation date."
				});
			}

			const diff = Math.floor(
				(Date.now() - new Date(createdAt).getTime()) /
					(1000 * 60 * 60 * 24)
			);

			if (diff < 7) {
				const remaining = 7 - diff;
				return deny({
					code: "ACCOUNT_TOO_NEW",
					message: `Account must be at least 7 days old before deletion. Please wait ${remaining} more ${remaining === 1 ? "day" : "days"}.`
				});
			}
			return allow();
		})
	),

	generateAI: definePolicy<BasePolicyContext, "ai.generate">(
		"ai.generate",
		combine(authorize("agents:chat"), requiresSubscription())
	)
};
