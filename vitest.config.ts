import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["config/**/*.test.ts", "packages/**/*.test.ts"],
		environment: "node"
	},
	resolve: {
		alias: {
			"@workspace/core": new URL(
				"./packages/core/index.ts",
				import.meta.url
			).pathname
		}
	}
});
