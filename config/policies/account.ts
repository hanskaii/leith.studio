import { authorize } from "../permissions";
import { definePolicy } from "@workspace/core";
import type { BasePolicyContext } from "@workspace/core";

export const AccountPolicy = {
	manageBilling: definePolicy<BasePolicyContext, "billing.manage">(
		"billing.manage",
		authorize("billing:manage")
	),

	manageApiKeys: definePolicy<BasePolicyContext, "api-keys.manage">(
		"api-keys.manage",
		authorize("api-keys:manage")
	),

	updateProfile: definePolicy<BasePolicyContext, "profile.update">(
		"profile.update",
		authorize("profile:update")
	),

	manageSecurity: definePolicy<BasePolicyContext, "security.manage">(
		"security.manage",
		authorize("security:manage")
	)
};
