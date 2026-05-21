import {
	WorkflowEntrypoint,
	type WorkflowStep,
	type WorkflowEvent
} from "cloudflare:workers";
import {
	database,
	studioGenerations,
	posts,
	postMetadata,
	eq,
	and
} from "@workspace/database";
import { uniqueSlug } from "../lib/slug";

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
			// 12.2 lock — atomic status flip pending_review → processing.
			// Returns null if another approval already grabbed this row.
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

			// 12.3 upload-video — fetch Vio temp URL into R2.
			currentStepName = "upload-video";
			const videoFileKey = await step.do(
				"upload-video",
				async (): Promise<string | null> => {
					if (!row.videoUrl) return null;
					const res = await fetch(row.videoUrl);
					if (!res.ok || !res.body) {
						throw new Error(`Failed to fetch video: ${res.status}`);
					}
					const key = `posts/video/${generationId}.mp4`;
					await this.env.STORAGE.put(key, res.body, {
						httpMetadata: { contentType: "video/mp4" }
					});
					return key;
				}
			);

			// 12.4 upload-thumbnail — imageUrl from generation is the natural
			// first-frame thumbnail. Stored as coverThumb on the post.
			currentStepName = "upload-thumbnail";
			const thumbnailKey = await step.do(
				"upload-thumbnail",
				async (): Promise<string | null> => {
					if (!row.imageUrl) return null;
					const res = await fetch(row.imageUrl);
					if (!res.ok || !res.body) {
						throw new Error(
							`Failed to fetch thumbnail: ${res.status}`
						);
					}
					const key = `posts/thumbnail/${generationId}.jpg`;
					await this.env.STORAGE.put(key, res.body, {
						httpMetadata: { contentType: "image/jpeg" }
					});
					return key;
				}
			);

			// 12.5 create-post — atomic insert posts + postMetadata + flip
			// studioGenerations to approved.
			currentStepName = "create-post";
			const created = await step.do("create-post", async () => {
				const db = database(this.env.DATABASE);
				const newPostId = crypto.randomUUID();
				const title = row.topic;
				const body = row.videoPrompt || row.imagePrompt || row.topic;
				const slug = await uniqueSlug(title, db);
				const now = new Date();
				const publishedAt = scheduledAt ? new Date(scheduledAt) : null;

				// For image-only generations, the image itself IS the file.
				// Use thumbnailKey as fileKey if no videoFileKey.
				const fileKey = videoFileKey ?? thumbnailKey;
				if (!fileKey) {
					throw new Error(
						"Generation has neither video nor image asset"
					);
				}
				const format = videoFileKey ? "mp4" : "jpg";

				await db.transaction(async (tx: any) => {
					await tx.insert(posts).values({
						id: newPostId,
						slug,
						title,
						body,
						coverImage: row.imageUrl,
						coverThumb: thumbnailKey,
						tags: [],
						status: "draft",
						publishedAt,
						createdAt: now,
						updatedAt: now
					});
					await tx.insert(postMetadata).values({
						postId: newPostId,
						format,
						resolution: "1920x1080",
						isLoop: videoFileKey ? 1 : 0,
						fileKey,
						fileSize: 0,
						access: "premium",
						processingStatus: videoFileKey ? "pending" : "ready"
					});
					await tx
						.update(studioGenerations)
						.set({ status: "approved", postId: newPostId })
						.where(eq(studioGenerations.id, generationId));
				});
				return { postId: newPostId, slug };
			});

			const { postId } = created;

			// 12.6 trigger-video-processing — only for video posts; image-only
			// posts are immediately ready.
			currentStepName = "trigger-video-processing";
			await step.do("trigger-video-processing", async () => {
				if (!videoFileKey) return;
				await this.env.VIDEO_PROCESSING_WORKFLOW.create({
					id: `process-${postId}`,
					params: {
						postId,
						slug: created.slug,
						fileKey: videoFileKey,
						format: "mp4"
					}
				});
			});

			// 12.7 notify-agent — DO RPC tells the StudioAgent the approve
			// is done; agent appends a chat message + broadcasts approve_done.
			currentStepName = "notify-agent";
			await step.do("notify-agent", async () => {
				const stub = this.env.STUDIO_AGENT.get(
					this.env.STUDIO_AGENT.idFromName(userId)
				);
				const type: "video" | "image" = videoFileKey
					? "video"
					: "image";
				// @ts-ignore -- RPC method on the agent DO
				await stub.onApproveDone({ generationId, postId, type });
			});

			return { postId, type: videoFileKey ? "video" : "image" };
		} catch (err: any) {
			// 12.8 on error: notify the agent so it can revert status + post
			// a retry message in chat, then re-throw so Workflows marks the
			// run as errored.
			try {
				const stub = this.env.STUDIO_AGENT.get(
					this.env.STUDIO_AGENT.idFromName(userId)
				);
				// @ts-ignore -- RPC method on the agent DO
				await stub.onApproveFailed({
					generationId,
					step: currentStepName,
					error: err.message ?? String(err)
				});
			} catch {
				// If even the notify fails, swallow — we still want the
				// workflow to error so it's visible in the dashboard.
			}
			throw err;
		}
	}
}
