import { definePolicy, combine } from "@workspace/core";
import type { BasePolicyContext } from "@workspace/core";
import { authorize } from "../permissions";

export const ContentPolicy = {
	read: definePolicy<BasePolicyContext, "content.read">(
		"content.read",
		authorize("content:read")
	),
	manage: definePolicy<BasePolicyContext, "content.manage">(
		"content.manage",
		combine(authorize("content:manage"))
	)
};
