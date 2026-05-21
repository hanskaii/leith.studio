import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc } from "@workspace/database";
import { studioGenerations } from "@workspace/database";
import { ApiResponse } from "../helpers/response.helper";
import { authMiddleware } from "../middleware/auth.middleware";
import { protect } from "../middleware/protect.middleware";
import type { HonoEnv } from "../types/hono.types";

const ApproveSchema = z.object({
	ids: z.array(z.string()).min(1),
	scheduledAt: z.string().datetime().optional()
});

const studioHandler = new Hono<HonoEnv>()
	.use("*", authMiddleware, protect("content.manage"))

	// ── Review ────────────────────────────────────────────────────────────────

	.get("/review", async (c) => {
		const db = c.get("db");
		const gens = await db.query.studioGenerations.findMany({
			where: eq(studioGenerations.status, "pending_review"),
			orderBy: desc(studioGenerations.createdAt)
		});
		return ApiResponse.ok(c, "ok", gens);
	})

	.post("/review/approve", zValidator("json", ApproveSchema), async (c) => {
		const { ids, scheduledAt } = c.req.valid("json");
		const user = c.get("user") as any;
		const results: { workflowId: string }[] = [];

		for (const generationId of ids) {
			const workflowId = `approve-${generationId}`;
			try {
				await c.env.STUDIO_APPROVE_WORKFLOW.create({
					id: workflowId,
					params: { generationId, userId: user.id, scheduledAt }
				});
				results.push({ workflowId });
			} catch {
				// already in flight
				results.push({ workflowId });
			}
		}

		return c.json(
			{ success: true, message: "Approval queued", data: results },
			202
		);
	})

	.post(
		"/review/reject",
		zValidator("json", z.object({ ids: z.array(z.string()).min(1) })),
		async (c) => {
			const db = c.get("db");
			const { ids } = c.req.valid("json");

			for (const genId of ids) {
				await db
					.update(studioGenerations)
					.set({ status: "rejected" })
					.where(eq(studioGenerations.id, genId));
			}

			return ApiResponse.ok(c, "Rejected");
		}
	);

export default studioHandler;
