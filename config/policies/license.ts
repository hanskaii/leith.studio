import { definePolicy } from "@workspace/core";
import type { BasePolicyContext } from "@workspace/core";
import { authorize } from "../permissions";

export const LicensePolicy = {
	activate: definePolicy<BasePolicyContext, "license.activate">(
		"license.activate",
		authorize("license:activate")
	)
};
