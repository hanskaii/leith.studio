import { Hono } from "hono";
import { cors } from "hono/cors";

import authHandler from "./handlers/auth.handler";
import { contract } from "./contract";

import type { HonoEnv } from "./types/hono.types";

import { STATUS_CODES, type StatusCode } from "./constants/status.constants";
import { ApiError } from "./helpers/errors.helper";

// Reverse map: 400 → "BAD_REQUEST", 500 → "INTERNAL_SERVER_ERROR", etc.
const STATUS_NAME: Record<StatusCode, string> = Object.fromEntries(
	Object.entries(STATUS_CODES).map(([k, v]) => [v, k])
) as Record<StatusCode, string>;

import { notFoundHandler } from "./helpers/not-found.helper";
import { ApiResponse } from "./helpers/response.helper";
import { ChatAgent } from "./agents/chat.agent";
import { PolicyError } from "@workspace/core";
import { EnvSchema } from "./env";

import { routeAgentRequest } from "agents";

import { authMiddleware } from "./middleware/auth.middleware";
import { protect } from "./middleware/protect.middleware";
import { dbMiddleware } from "./middleware/db.middleware";
import { boot } from "./boot";

boot();

// Validate env once per isolate lifetime
let envValidated = false;

const app = new Hono<HonoEnv>();

// Enable CORS for all routes
app.use(
	"*",
	cors({
		origin: (origin) => origin,
		allowHeaders: ["Content-Type", "Authorization", "x-api-key"],
		allowMethods: ["POST", "GET", "OPTIONS", "PUT", "DELETE"],
		credentials: true
	})
);

// Set db on every request
app.use("*", dbMiddleware);

// Auth routes (better-auth)
app.route("/", authHandler);

// Typed RPC contract routes (licenses, uploads, etc.)
app.route("/", contract);

// Health check
app.get("/", (c) => ApiResponse.ok(c, "Welcome to the API"));

// Studio agent — protected by content.manage only (NOT app.use).
// MUST be registered before the catchall /agents/* below.
app.all(
	"/agents/studio-agent/*",
	authMiddleware,
	protect("content.manage"),
	async (c) => {
		const user = c.get("user") as any;
		const res = await (routeAgentRequest as any)(
			c.req.raw,
			(c as any).env,
			{ metadata: { userId: user.id } }
		);
		if (res) return res;
		return c.notFound();
	}
);

app.all("/agents/*", authMiddleware, protect("app.use"), async (c) => {
	const user = c.get("user") as any;
	const res = await (routeAgentRequest as any)(c.req.raw, (c as any).env, {
		metadata: {
			dodoCustomerId: user.dodoCustomerId,
			credits: user.credits
		}
	});
	if (res) return res;
	return c.notFound();
});

app.notFound(notFoundHandler);

app.onError((err, c) => {
	console.error(`${err}`);

	if (err instanceof PolicyError) {
		return c.json(
			{
				success: false,
				message: err.message,
				code: err.code,
				errors: null
			},
			403
		);
	}

	if (err instanceof ApiError) {
		return c.json(
			{
				success: false,
				message: err.message,
				code: STATUS_NAME[err.statusCode] ?? "INTERNAL_SERVER_ERROR",
				errors: err.errors ?? null
			},
			err.statusCode as any
		);
	}

	return c.json(
		{
			success: false,
			message: err.message || "Internal Server Error",
			code: "INTERNAL_SERVER_ERROR",
			errors: null
		},
		STATUS_CODES.INTERNAL_SERVER_ERROR
	);
});

export { ChatAgent };
export { StudioAgent } from "./agents/studio.agent";
export { VideoProcessingWorkflow } from "./workflows/video-processing.workflow";
export { VioImageWorkflow } from "./workflows/vio-image.workflow";
export { VioVideoWorkflow } from "./workflows/vio-video.workflow";
export { VioUpscaleWorkflow } from "./workflows/vio-upscale.workflow";
export { VioMotionControlWorkflow } from "./workflows/vio-motion-control.workflow";
export { StudioApproveWorkflow } from "./workflows/studio-approve.workflow";
export { MediaContainer } from "./containers/media.container";
export type { AppType } from "./contract";

export default {
	fetch: async (
		request: Request,
		env: CloudflareBindings,
		ctx: ExecutionContext
	) => {
		if (!envValidated) {
			const result = EnvSchema.safeParse(env);
			if (!result.success) {
				const missing = result.error.issues
					.map((i) => `${i.path.join(".")}: ${i.message}`)
					.join(", ");
				console.error(`[ENV] Invalid environment: ${missing}`);
				return Response.json(
					{ error: "Server misconfiguration", details: missing },
					{ status: 500 }
				);
			}
			envValidated = true;
		}
		return app.fetch(request, env, ctx);
	},

	scheduled: async (
		_event: ScheduledController,
		_env: CloudflareBindings,
		_ctx: ExecutionContext
	) => {
		// Studio generation scheduling is now handled by per-user StudioAgent
		// DO alarms (via this.schedule()), so the worker cron is a no-op here.
	}
} satisfies ExportedHandler<CloudflareBindings>;
