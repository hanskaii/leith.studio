import { definePolicy, allow, deny, combine } from "@workspace/core";
import type { BasePolicyContext } from "@workspace/core";
import { authorize } from "../permissions";

export const AppPolicy = {
	use: definePolicy<BasePolicyContext, "app.use">(
		"app.use",
		combine(authorize("app:use"), (ctx) => {
			const s = ctx.actor.subscriptionStatus;
			if (s === "active" || s === "lifetime") return allow();
			return deny({
				code: "SUBSCRIPTION_REQUIRED",
				message: "An active subscription is required to use this app."
			});
		})
	)
};
