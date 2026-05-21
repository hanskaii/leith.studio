import {
	WorkflowEntrypoint,
	WorkflowStep,
	WorkflowEvent
} from "cloudflare:workers";
import {
	database,
	studioGenerations,
	posts,
	postMetadata,
	eq,
	and
} from "@workspace/database";
import { nanoid } from "nanoid";

type ApproveParams = {
	generationId: string;
	userId: string;
	scheduledAt?: string;
};

export class StudioApproveWorkflow extends WorkflowEntrypoint<
	CloudflareBindings,
	ApproveParams
> {
	async run(event: WorkflowEvent<ApproveParams>, step: WorkflowStep) {
		const { generationId, userId, scheduledAt } = event.payload;
		let currentStepName = "lock";

		try {
			// 12.2 lock
			const row = await step.do("lock", async () => {
				const db = database(this.env.DATABASE);
				const result = await db
					.update(studioGenerations)
					.set({ status: "processing" })
					.where(
						and(
							eq(studioGenerations.id, generationId),
							eq(studioGenerations.status, "pending_review")
						)
					)
					.returning();

				if (result.length === 0) return null;
				return result[0];
			});

			if (!row) return { skipped: true };

			// 12.3 upload-video
			currentStepName = "upload-video";
			const videoFileKey = await step.do("upload-video", async () => {
				if (!row.videoUrl) return null;
				const res = await fetch(row.videoUrl);
				if (!res.ok) throw new Error("Failed to fetch video");
				const key = `posts/video/${generationId}.mp4`;
				await this.env.STORAGE.put(key, res.body as any);
				return key;
			});

			// 12.4 upload-thumbnail
			currentStepName = "upload-thumbnail";
			const thumbnailKey = await step.do("upload-thumbnail", async () => {
				if (!row.imageUrl) return null;
				const res = await fetch(row.imageUrl);
				if (!res.ok) throw new Error("Failed to fetch image");
				const key = `posts/thumbnail/${generationId}.jpg`;
				await this.env.STORAGE.put(key, res.body as any);
				return key;
			});

			// 12.5 create-post
			currentStepName = "create-post";
			const postId = await step.do("create-post", async () => {
				const db = database(this.env.DATABASE);
				const newPostId = nanoid();
				const type = videoFileKey ? "video" : "image";

				await db.transaction(async (tx: any) => {
					await tx.insert(posts).values({
						id: newPostId,
						status: "draft",
						type,
						scheduledAt: scheduledAt ? new Date(scheduledAt) : null
					});
					await tx.insert(postMetadata).values({
						postId: newPostId,
						imageUrl: row.imageUrl,
						fileKey: videoFileKey,
						thumbnailKey
					});
					await tx
						.update(studioGenerations)
						.set({ status: "approved", postId: newPostId })
						.where(eq(studioGenerations.id, generationId));
				});
				return newPostId;
			});

			// 12.6 trigger-video-processing
			currentStepName = "trigger-video-processing";
			await step.do("trigger-video-processing", async () => {
				if (videoFileKey) {
					await this.env.VIDEO_PROCESSING_WORKFLOW.create({
						id: `process-${postId}`,
						params: { postId, fileKey: videoFileKey }
					});
				}
			});

			// 12.7 notify-agent
			currentStepName = "notify-agent";
			await step.do("notify-agent", async () => {
				const stub = this.env.STUDIO_AGENT.get(
					this.env.STUDIO_AGENT.idFromName(userId)
				);
				const type = videoFileKey ? "video" : "image";
				// @ts-ignore
				await stub.onApproveDone({ generationId, postId, type });
			});
		} catch (err: any) {
			const stub = this.env.STUDIO_AGENT.get(
				this.env.STUDIO_AGENT.idFromName(userId)
			);
			// @ts-ignore
			await stub.onApproveFailed({
				generationId,
				step: currentStepName,
				error: err.message
			});
			throw err;
		}
	}
}
