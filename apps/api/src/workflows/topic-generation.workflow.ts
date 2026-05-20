import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { VioService } from "../services/vio.service";
import type { HonoEnv } from "../types/hono.types";
import {
	database,
	generationTopics,
	topicGenerations
} from "@workspace/database";
import { eq } from "@workspace/database";

type Env = HonoEnv["Bindings"];

export type TopicGenerationParams = {
	topicId: string;
	topic: string;
	count: number;
	imageModel: string;
	videoModel: string;
	referenceImageUrl?: string;
	imagePromptTemplate: string;
	videoPromptTemplate: string;
};

function imageSleepDuration(attempt: number): string {
	if (attempt < 5) return "5 seconds";
	if (attempt < 15) return "10 seconds";
	return "15 seconds";
}

function videoSleepDuration(attempt: number): string {
	if (attempt < 5) return "10 seconds";
	if (attempt < 20) return "15 seconds";
	return "20 seconds";
}

async function expandPrompt(
	ai: Env["AI"],
	systemContent: string
): Promise<string> {
	const result = (await (ai as any).run(
		"@cf/meta/llama-3.3-70b-instruct-fp8-fast",
		{
			messages: [{ role: "user", content: systemContent }],
			max_tokens: 600
		}
	)) as any;
	const text: string =
		result?.response ?? result?.generated_text ?? systemContent;
	return text.trim();
}

export class TopicGenerationWorkflow extends WorkflowEntrypoint<
	Env,
	TopicGenerationParams
> {
	async run(
		event: WorkflowEvent<TopicGenerationParams>,
		step: WorkflowStep
	): Promise<void> {
		const params = event.payload;
		const vio = new VioService(this.env.VIO_API_KEY);
		const db = database(this.env.DATABASE);

		// Optional: upload reference image to Vio once so all gens share it
		let referenceAssetId: number | undefined;
		if (params.referenceImageUrl) {
			referenceAssetId = await step.do("upload-reference", async () => {
				const res = await fetch(params.referenceImageUrl!);
				const blob = await res.blob();
				const asset = await vio.uploadAsset(blob);
				return asset.asset_id;
			});
		}

		for (let i = 0; i < params.count; i++) {
			// ── 1. Expand image prompt ────────────────────────────────────────────
			const imagePrompt = await step.do(
				`expand-image-prompt-${i}`,
				() => {
					const content = params.imagePromptTemplate
						.replace("{topic}", params.topic)
						.replace(
							"{reference_style}",
							"cinematic, detailed, high quality"
						);
					return expandPrompt(this.env.AI, content);
				}
			);

			// ── 2. Submit image generation ────────────────────────────────────────
			const imageGenId = await step.do(`submit-image-${i}`, async () => {
				const res = await vio.generateImage({
					prompt: imagePrompt,
					model: params.imageModel as any,
					aspect_ratio: "16:9",
					count: 1,
					...(referenceAssetId
						? { reference_asset_ids: [referenceAssetId] }
						: {})
				});
				return res.generation_ids[0];
			});

			// ── 3. Poll image ─────────────────────────────────────────────────────
			let imageGen = await step.do(`fetch-image-${i}`, () =>
				vio.getGeneration(imageGenId)
			);

			let imgAttempt = 0;
			while (
				imageGen.status !== "completed" &&
				imageGen.status !== "failed" &&
				imgAttempt < 60
			) {
				await step.sleep(
					`wait-image-${i}-${imgAttempt}`,
					imageSleepDuration(imgAttempt)
				);
				imageGen = await step.do(`poll-image-${i}-${imgAttempt}`, () =>
					vio.getGeneration(imageGenId)
				);
				imgAttempt++;
			}

			if (imageGen.status !== "completed" || !imageGen.asset_url) {
				await step.do(`save-image-failed-${i}`, async () => {
					await db.insert(topicGenerations).values({
						id: crypto.randomUUID(),
						topicId: params.topicId,
						imagePrompt,
						vioImageId: imageGenId,
						status: "rejected",
						createdAt: new Date()
					});
					return null;
				});
				continue;
			}

			// ── 4. Upload image to Vio assets (needed for i2v) ────────────────────
			const startFrameAssetId = await step.do(
				`upload-image-asset-${i}`,
				async () => {
					const res = await fetch(imageGen.asset_url!);
					const blob = await res.blob();
					const asset = await vio.uploadAsset(blob);
					return asset.asset_id;
				}
			);

			// ── 5. Create topicGeneration row (image_ready) ───────────────────────
			const topicGenId = await step.do(
				`save-image-ready-${i}`,
				async () => {
					const id = crypto.randomUUID();
					await db.insert(topicGenerations).values({
						id,
						topicId: params.topicId,
						imagePrompt,
						vioImageId: imageGenId,
						imageUrl: imageGen.asset_url,
						status: "image_ready",
						createdAt: new Date()
					});
					return id;
				}
			);

			// ── 6. Expand video prompt ────────────────────────────────────────────
			const videoPrompt = await step.do(
				`expand-video-prompt-${i}`,
				() => {
					const content = params.videoPromptTemplate.replace(
						"{image_prompt}",
						imagePrompt
					);
					return expandPrompt(this.env.AI, content);
				}
			);

			// ── 7. Submit video generation (i2v) ──────────────────────────────────
			const videoGenId = await step.do(`submit-video-${i}`, async () => {
				const res = await vio.generateVideo({
					prompt: videoPrompt,
					mode: "i2v",
					model: params.videoModel as any,
					aspect_ratio: "16:9",
					count: 1,
					start_frame_asset_id: startFrameAssetId
				});
				return res.generation_ids[0];
			});

			// ── 8. Poll video ─────────────────────────────────────────────────────
			let videoGen = await step.do(`fetch-video-${i}`, () =>
				vio.getGeneration(videoGenId)
			);

			let vidAttempt = 0;
			while (
				videoGen.status !== "completed" &&
				videoGen.status !== "failed" &&
				vidAttempt < 80
			) {
				await step.sleep(
					`wait-video-${i}-${vidAttempt}`,
					videoSleepDuration(vidAttempt)
				);
				videoGen = await step.do(`poll-video-${i}-${vidAttempt}`, () =>
					vio.getGeneration(videoGenId)
				);
				vidAttempt++;
			}

			// ── 9. Update row with final video URL ────────────────────────────────
			await step.do(`save-video-${i}`, async () => {
				const isReady =
					videoGen.status === "completed" && !!videoGen.asset_url;
				await db
					.update(topicGenerations)
					.set({
						videoPrompt,
						vioVideoId: videoGenId,
						videoUrl: videoGen.asset_url,
						status: isReady ? "ready" : "rejected"
					})
					.where(eq(topicGenerations.id, topicGenId));
				return null;
			});
		}

		// ── 10. Mark topic as ready_for_review ────────────────────────────────────
		await step.do("finalize-topic", async () => {
			await db
				.update(generationTopics)
				.set({ status: "ready_for_review", updatedAt: new Date() })
				.where(eq(generationTopics.id, params.topicId));
			return null;
		});
	}
}
