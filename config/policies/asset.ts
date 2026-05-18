import { definePolicy, combine, allow, deny } from "@workspace/core";
import type { BasePolicyContext } from "@workspace/core";
import { authorize } from "../permissions";

interface AssetDownloadContext extends BasePolicyContext {
	resource: { access: "free" | "premium" };
}

export const AssetPolicy = {
	download: definePolicy<AssetDownloadContext, "asset.download">(
		"asset.download",
		combine(authorize("asset:download:free"), (ctx) => {
			if (ctx.resource.access === "free") return allow();
			return authorize("asset:download:premium")(ctx);
		})
	)
};
