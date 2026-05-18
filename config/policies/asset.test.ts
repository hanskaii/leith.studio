import { describe, it, expect } from "vitest";
import { AssetPolicy } from "./asset";

const actor = (role: string) => ({ id: "user-1", role });

describe("AssetPolicy.download", () => {
	it("allows user role to download a free asset", async () => {
		const result = await AssetPolicy.download.fn({
			actor: actor("user"),
			resource: { access: "free" }
		});
		expect(result.allowed).toBe(true);
	});

	it("denies user role from downloading a premium asset", async () => {
		const result = await AssetPolicy.download.fn({
			actor: actor("user"),
			resource: { access: "premium" }
		});
		expect(result.allowed).toBe(false);
		expect(result.code).toBe("INSUFFICIENT_PERMISSIONS");
	});

	it("allows member role to download a premium asset", async () => {
		const result = await AssetPolicy.download.fn({
			actor: actor("member"),
			resource: { access: "premium" }
		});
		expect(result.allowed).toBe(true);
	});

	it("allows admin role to download a premium asset", async () => {
		const result = await AssetPolicy.download.fn({
			actor: actor("admin"),
			resource: { access: "premium" }
		});
		expect(result.allowed).toBe(true);
	});

	it("denies unknown role from downloading any asset", async () => {
		const result = await AssetPolicy.download.fn({
			actor: actor("guest"),
			resource: { access: "free" }
		});
		expect(result.allowed).toBe(false);
	});
});
