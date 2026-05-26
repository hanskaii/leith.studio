import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { database, posts } from "@workspace/database";
import { eq } from "drizzle-orm";
import type { HonoEnv } from "../types/hono.types";

type Env = HonoEnv["Bindings"];

export type AiEnrichParams = {
	postId: string;
};

// STUB IMPLEMENTATION — fills the post with placeholder values derived from
// the existing title (typically the filename). Real AI enrichment will be
// added once the upload flow is stable. Mirrors the studio-approve
// `ai-enrich` step API surface so it's a drop-in upgrade later.
export class AiEnrichWorkflow extends WorkflowEntrypoint<Env, AiEnrichParams> {
	async run(event: WorkflowEvent<AiEnrichParams>, step: WorkflowStep) {
		const { postId } = event.payload;

		await step.do("mark-processing", async () => {
			const db = database(this.env.DATABASE);
			await db
				.update(posts)
				.set({ enrichmentStatus: "processing" })
				.where(eq(posts.id, postId));
		});

		await step.do("enrich-placeholder", async () => {
			const db = database(this.env.DATABASE);
			const existing = await db.query.posts.findFirst({
				where: eq(posts.id, postId),
				columns: { title: true, body: true }
			});
			if (!existing) {
				throw new Error(`post ${postId} disappeared mid-enrich`);
			}

			// Only fill what's empty — manual edits in the drawer should
			// survive an enrichment run.
			const updates: { title?: string; body?: string } = {};
			if (!existing.title || existing.title.trim() === "") {
				updates.title = "Untitled upload";
			}
			if (!existing.body || existing.body.trim() === "") {
				updates.body = "Add a description for this asset.";
			}

			if (Object.keys(updates).length > 0) {
				await db.update(posts).set(updates).where(eq(posts.id, postId));
			}
		});

		await step.do("mark-done", async () => {
			const db = database(this.env.DATABASE);
			await db
				.update(posts)
				.set({ enrichmentStatus: "done" })
				.where(eq(posts.id, postId));
		});
	}
}
