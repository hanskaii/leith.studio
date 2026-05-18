import { Hono } from "hono";
import { AuthService } from "../services/auth.service";
import { ApiResponse } from "../helpers/response.helper";
import type { HonoEnv } from "@/types/hono.types";

const app = new Hono<HonoEnv>().on(
	["POST", "GET"],
	"/api/auth/*",
	async (c) => {
		try {
			const authService = new AuthService(c.env);
			const response = await authService.auth.handler(c.req.raw);
			if (!response) {
				console.error("Auth handler returned no response");
				return ApiResponse.error(
					c,
					"Auth handler returned no response"
				);
			}
			return response;
		} catch (error) {
			console.error("Auth handler error:", error);
			return ApiResponse.error(
				c,
				`Auth handler failed: ${String(error)}`
			);
		}
	}
);

export default app;
