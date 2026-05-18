import { Gate, type InferPolicyActions } from "@workspace/core";
import { UserPolicy } from "./policies/user";
import { AccountPolicy } from "./policies/account";
import { AppPolicy } from "./policies/app";
import { ContentPolicy } from "./policies/content";
import { LicensePolicy } from "./policies/license";
import { AssetPolicy } from "./policies/asset";

/**
 * Extend GateActions with app-specific policy action types.
 * This gives full type-safety when calling Gate.can() / Gate.assert().
 */
declare module "@workspace/core" {
	interface GateActions
		extends
			InferPolicyActions<typeof UserPolicy>,
			InferPolicyActions<typeof AccountPolicy>,
			InferPolicyActions<typeof AppPolicy>,
			InferPolicyActions<typeof ContentPolicy>,
			InferPolicyActions<typeof LicensePolicy>,
			InferPolicyActions<typeof AssetPolicy> {}
}

/**
 * Register app policies with the global Gate.
 * Importing this package is enough — no manual Gate.policies() call needed.
 */
Gate.policies({
	user: UserPolicy,
	account: AccountPolicy,
	app: AppPolicy,
	content: ContentPolicy,
	license: LicensePolicy,
	asset: AssetPolicy
});

export * from "./app";
export * from "./permissions";
export * from "./policies/user";
export * from "./policies/account";
export * from "./policies/app";
export * from "./policies/content";
export * from "./policies/license";
export * from "./policies/asset";
