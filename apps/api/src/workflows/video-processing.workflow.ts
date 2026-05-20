import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { database, postMetadata } from "@workspace/database";
import { eq } from "drizzle-orm";
import type { HonoEnv } from "../types/hono.types";

type Env = HonoEnv["Bindings"];

export type VideoProcessingParams = {
	postId: string;
	slug: string;
	fileKey: string;
};

export class VideoProcessingWorkflow extends WorkflowEntrypoint<
	Env,
	VideoProcessingParams
> {
	async run(event: WorkflowEvent<VideoProcessingParams>, step: WorkflowStep) {
		const { postId, slug, fileKey } = event.payload;

		await step.do("mark-processing", async () => {
			const db = database(this.env.DATABASE);
			await db
				.update(postMetadata)
				.set({ processingStatus: "processing" })
				.where(eq(postMetadata.postId, postId));
		});

		const keys = await step.do("process-video", async () => {
			const previewKey = `previews/${slug}-480p.mp4`;
			const clipKey = `clips/${slug}-clip.mp4`;

			const container = this.env.MEDIA_CONTAINER.get(
				this.env.MEDIA_CONTAINER.idFromName("media")
			);

			const res = await container.fetch(
				new Request("http://container/process", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						items: [
							{
								inputPath: `/mnt/r2/${fileKey}`,
								outputPath: `/mnt/r2/${previewKey}`,
								pipeline: [
									{
										type: "resize",
										width: 854,
										height: 480,
										fit: "contain"
									}
								]
							},
							{
								inputPath: `/mnt/r2/${fileKey}`,
								outputPath: `/mnt/r2/${clipKey}`,
								pipeline: [
									{ type: "clip", durationSeconds: 10 },
									{
										type: "resize",
										width: 640,
										height: 360,
										fit: "contain"
									}
								]
							}
						]
					})
				})
			);

			if (!res.ok)
				throw new Error(`Container failed: ${await res.text()}`);
			return { previewKey, clipKey };
		});

		await step.do("mark-ready", async () => {
			const db = database(this.env.DATABASE);
			await db
				.update(postMetadata)
				.set({
					previewKey: keys.previewKey,
					clipKey: keys.clipKey,
					processingStatus: "ready"
				})
				.where(eq(postMetadata.postId, postId));
		});
	}
}
