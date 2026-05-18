import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import DodoPayments from "dodopayments";
import { ApiError } from "../helpers/errors.helper";
import { ApiResponse } from "../helpers/response.helper";
import { authMiddleware } from "../middleware/auth.middleware";
import { protect } from "../middleware/protect.middleware";
import { AuthService } from "../services/auth.service";
import type { HonoEnv } from "../types/hono.types";

const ActivateSchema = z.object({
	key: z.string().min(1, "License key is required")
});

const licenseHandler = new Hono<HonoEnv>().post(
	"/activate",
	authMiddleware,
	protect("license.activate"),
	zValidator("json", ActivateSchema),
	async (c) => {
		const user = c.get("user");

		// Idempotency: already a member
		if (user.role === "member" || user.role === "admin") {
			return ApiResponse.ok(c, "You already have access.", {
				alreadyMember: true
			});
		}

		const { key } = c.req.valid("json");

		const dodo = new DodoPayments({
			bearerToken: c.env.DODO_PAYMENTS_API_KEY,
			environment:
				c.env.APP_ENV === "production" ? "live_mode" : "test_mode"
		});

		let isValid = false;
		try {
			const result = await dodo.licenses.validate({ license_key: key });
			isValid = result.valid;
		} catch {
			throw ApiError.badRequest("Invalid or expired license key.");
		}

		if (!isValid) {
			throw ApiError.badRequest("Invalid or expired license key.");
		}

		const authService = new AuthService(c.env);
		await authService.auth.api.setRole({
			body: { userId: user.id, role: "member" as any },
			headers: c.req.raw.headers
		});

		return ApiResponse.ok(c, "Access granted!", { activated: true });
	}
);

export default licenseHandler;
