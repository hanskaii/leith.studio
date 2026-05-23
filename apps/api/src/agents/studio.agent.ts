import { AIChatAgent } from "@cloudflare/ai-chat";
import { type Schedule } from "agents";
import { createWorkersAI } from "workers-ai-provider";
import { database, studioGenerations, eq, desc } from "@workspace/database";
import { VioService } from "../services/vio.service";
import {
	streamText,
	generateText,
	type StreamTextOnFinishCallback,
	type ToolSet,
	tool,
	stepCountIs,
	convertToModelMessages,
	pruneMessages
} from "ai";
import { type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { z } from "zod";

type FlowStep =
	| { type: "expand_prompt" }
	| { type: "generate_image"; params: { model: string } }
	| { type: "wait_image_workflow" }
	| { type: "upload_asset" }
	| { type: "generate_loop_prompt" }
	| {
			type: "generate_video";
			params: {
				model: string;
				mode: string;
				startFrameRef?: string;
				endFrameRef?: string;
			};
	  }
	| { type: "wait_video_workflow" }
	| { type: "save_result" };

export class StudioAgent extends AIChatAgent<CloudflareBindings> {
	override onStart() {
		this.sql`
			CREATE TABLE IF NOT EXISTS flow_state (
				id           TEXT PRIMARY KEY,
				steps        TEXT NOT NULL,
				current_step INTEGER NOT NULL DEFAULT 0,
				accumulated  TEXT NOT NULL DEFAULT '{}',
				started_at   INTEGER NOT NULL,
				updated_at   INTEGER NOT NULL
			)
		`;
	}

	async getStats() {
		const db = database(this.env.DATABASE);
		const inFlightFlows = (
			Array.from(
				this.sql`SELECT COUNT(*) as count FROM flow_state`
			) as any[]
		)[0].count;
		const activeSchedules = (await this.getSchedules()).length;

		const pendingReviews = await db.query.studioGenerations.findMany({
			where: eq(studioGenerations.status, "pending_review")
		});

		return {
			activeSchedules,
			inFlightFlows,
			pendingReviews: pendingReviews.length
		};
	}

	override async onConnect(connection: any, ctx: any) {
		super.onConnect?.(connection, ctx);
		const stats = await this.getStats();
		connection.send(JSON.stringify({ type: "stats", ...stats }));
	}

	async onChatMessage(
		onFinish: StreamTextOnFinishCallback<ToolSet>,
		options?: OnChatMessageOptions
	): Promise<Response | undefined> {
		const workersai = createWorkersAI({ binding: this.env.AI });

		const stats = await this.getStats();

		// extract latest user message to see if there are images
		const lastUserMsg = this.messages
			.slice()
			.reverse()
			.find((m) => m.role === "user");
		let hasImages = false;
		if (lastUserMsg && Array.isArray((lastUserMsg as any).content)) {
			hasImages = (lastUserMsg as any).content.some(
				(p: any) => p.type === "image"
			);
		}

		const systemNote = hasImages
			? `\n\nUser attached image(s) — reference them as @image-1, @image-2, ... in startFrameRef/endFrameRef when composing generate_video steps.`
			: "";

		const result = streamText({
			model: workersai("@cf/zai-org/glm-4.7-flash"),
			system: `You are Leith Studio Agent — an AI that generates images and videos through the VIO Studio API via a multi-step workflow engine.

## Image models (use in generate_image step)
| Model | Cost | Notes |
|-------|------|-------|
| nano-banana-2 | 3 credits | Default. Up to 9 refs, qualities: 512p/1080p/1440p/2160p |
| nano-banana-pro | 3 credits | Premium. Up to 10 refs, qualities: 1080p/1440p/2160p |
| seedream-4.0 | 3 credits | High-detail. Up to 6 refs, qualities: 1080p/1440p/2160p |
| seedream-5.0-lite | 3 credits | Lightweight v5. qualities: 1440p/1800p |
| gpt-image-2.0 | 5 credits | Best quality. Up to 9 refs, qualities: 1080p/1440p/2160p |
| qwen-image | 3 credits | Strong photoreal |
| kling-3.0 | 3 credits | Single ref Kling |

Image aspect ratios: 16:9, 4:3, 1:1, 3:4, 9:16 (and 3:2, 2:3, 21:9 for seedream).

## Video models (use in generate_video step)
| Model | Cost | Mode | Notes |
|-------|------|------|-------|
| veo-3.1-fast | 50 credits | t2v, i2v | Best quality Veo, fast |
| veo-3.1-quality | 100 credits | t2v, i2v | Highest quality |
| veo-3.1-lite | 5 credits | t2v, i2v, r2v | Cheapest, supports r2v (max 3 refs) |
| v6 | banded | t2v, i2v, r2v | Latest native PixVerse, up to 1080p/15s |
| seedance-2.0 | banded | t2v, i2v, r2v | 9-ref fusion, qualities: 480p/720p/1080p |
| kling-v3 | banded | t2v, i2v | qualities: 720p/1080p, durations: 3–15s |
| sora-2 | banded | t2v | qualities: 720p, durations: 4/8/12s |
| happyhorse-1.0 | banded | t2v, i2v | Always-on audio, qualities: 720p/1080p |

Video modes: t2v (text-to-video), i2v (image-to-video, needs start_frame_asset_id), r2v (reference-to-video).
Video aspect ratios: landscape (16:9), portrait (9:16), 1:1.

## Flow step types
Each step must include "type". Some steps need "params".

- { "type": "expand_prompt" } — expands user topic into a detailed image gen prompt
- { "type": "generate_image", "params": { "model": "<image_model>" } } — triggers image generation
- { "type": "wait_image_workflow" } — waits for image to complete
- { "type": "upload_asset" } — uploads generated image as a reusable asset
- { "type": "generate_loop_prompt" } — writes an animation prompt for looping video
- { "type": "generate_video", "params": { "model": "<video_model>", "mode": "i2v", "startFrameRef": "@image-1" } } — triggers video generation (use mode i2v when an image was generated)
- { "type": "wait_video_workflow" } — waits for video to complete
- { "type": "save_result" } — saves the final result to the studio review queue

## Typical flow for "video loop from image"
steps: [expand_prompt, generate_image, wait_image_workflow, upload_asset, generate_loop_prompt, generate_video, wait_video_workflow, save_result]

## Rules
- NEVER use model names not in the lists above.
- For image-only: steps end at save_result after wait_image_workflow. No video steps needed.
- For video with reference image from user: use startFrameRef: "@image-1" (not upload_asset — the image is already uploaded).
- Always ask for clarification if quality vs cost tradeoff is unclear (e.g., veo-3.1-fast vs veo-3.1-quality).
- Suggest nano-banana-2 as the default image model and veo-3.1-fast as the default video model.
- For setFlowSchedule: use flowType "image", "video-loop", or "video-t2v" — do NOT try to pass a steps array. Optionally override imageModel/videoModel.

Current stats: ${stats.inFlightFlows} in-flight flows, ${stats.pendingReviews} pending reviews, ${stats.activeSchedules} active schedules.
Today: ${new Date().toISOString()}.${systemNote}`,
			messages: pruneMessages({
				messages: await convertToModelMessages(this.messages),
				toolCalls: "before-last-2-messages"
			}),
			tools: {
				runFlowNow: tool({
					description:
						"Trigger a new generation flow immediately. Provide a 'topic' (human-readable description) and a 'steps' array composed from the documented step types. Use image models from the image model list and video models from the video model list only.",
					inputSchema: z.object({
						topic: z
							.string()
							.describe(
								"Human-readable topic for the generation"
							),
						steps: z
							.array(z.any())
							.describe(
								"Ordered array of flow step objects. Each must have a 'type' field and optional 'params' as documented in the system prompt."
							)
					}),
					execute: async (args: any) => {
						const { topic, steps } = args;
						const inFlightFlows = (
							Array.from(
								this
									.sql`SELECT COUNT(*) as count FROM flow_state`
							) as any[]
						)[0].count;
						if (inFlightFlows >= 3) {
							this.broadcast(
								JSON.stringify({
									type: "flow_skipped",
									reason: "max_concurrent_reached",
									activeCount: inFlightFlows
								})
							);
							return "Failed: Maximum concurrent flows reached (3). Please wait for some to finish.";
						}

						const userAssets: Record<string, string> = {};
						if (
							lastUserMsg &&
							Array.isArray((lastUserMsg as any).content)
						) {
							const imageParts = (
								lastUserMsg as any
							).content.filter((p: any) => p.type === "image");
							for (let i = 0; i < imageParts.length; i++) {
								const img = imageParts[i].image;
								try {
									let blob: Blob;
									if (
										typeof img === "string" &&
										img.startsWith("data:")
									) {
										const base64 = img.split(",")[1];
										const byteCharacters = atob(base64);
										const byteNumbers = new Array(
											byteCharacters.length
										);
										for (
											let j = 0;
											j < byteCharacters.length;
											j++
										) {
											byteNumbers[j] =
												byteCharacters.charCodeAt(j);
										}
										const byteArray = new Uint8Array(
											byteNumbers
										);
										blob = new Blob([byteArray]);
									} else {
										// Assume URL or convertable
										const res = await fetch(img as string);
										blob = await res.blob();
									}

									const asset = await new VioService(
										this.env.VIO_API_KEY
									).uploadAsset(blob);
									userAssets[`image-${i + 1}`] = String(
										asset.asset_id
									);
								} catch (error) {
									return `Failed to upload image attachment: ${error}`;
								}
							}
						}

						const flowId = crypto.randomUUID();
						const accumulated = {
							topic,
							triggeredBy: "manual",
							userAssets
						};

						this.sql`
							INSERT INTO flow_state (id, steps, current_step, accumulated, started_at, updated_at)
							VALUES (${flowId}, ${JSON.stringify(steps)}, 0, ${JSON.stringify(accumulated)}, ${Date.now()}, ${Date.now()})
						`;

						await this.schedule(
							0,
							"executeTask",
							JSON.stringify({ flowId })
						);
						return `Flow started with ID: ${flowId}`;
					}
				}),
				setFlowSchedule: tool({
					description:
						"Set a recurring cron schedule to automatically trigger generation flows. Use standard cron expressions (e.g. '0 9 * * *' for daily at 9am). Picks sensible default models — override with imageModel/videoModel if needed.",
					inputSchema: z.object({
						cron: z
							.string()
							.describe(
								"Standard cron expression, e.g. '0 9 * * *'"
							),
						topic: z
							.string()
							.describe(
								"Human-readable topic for scheduled generations"
							),
						flowType: z
							.enum(["image", "video-loop", "video-t2v"])
							.describe(
								"'image' = expand prompt → generate image → save. 'video-loop' = expand prompt → generate image → upload → generate loop prompt → i2v video → save. 'video-t2v' = expand prompt → t2v video → save."
							),
						imageModel: z
							.string()
							.optional()
							.describe(
								"Image model to use (default: nano-banana-2)"
							),
						videoModel: z
							.string()
							.optional()
							.describe(
								"Video model to use (default: veo-3.1-fast)"
							)
					}),
					execute: async (args: any) => {
						const {
							cron,
							topic,
							flowType,
							imageModel,
							videoModel
						} = args;

						const imgModel = imageModel || "nano-banana-2";
						const vidModel = videoModel || "veo-3.1-fast";

						let steps: FlowStep[];
						switch (flowType) {
							case "image":
								steps = [
									{ type: "expand_prompt" },
									{
										type: "generate_image",
										params: { model: imgModel }
									},
									{ type: "wait_image_workflow" },
									{ type: "save_result" }
								];
								break;
							case "video-loop":
								steps = [
									{ type: "expand_prompt" },
									{
										type: "generate_image",
										params: { model: imgModel }
									},
									{ type: "wait_image_workflow" },
									{ type: "upload_asset" },
									{ type: "generate_loop_prompt" },
									{
										type: "generate_video",
										params: { model: vidModel, mode: "i2v" }
									},
									{ type: "wait_video_workflow" },
									{ type: "save_result" }
								];
								break;
							case "video-t2v":
							default:
								steps = [
									{ type: "expand_prompt" },
									{
										type: "generate_video",
										params: { model: vidModel, mode: "t2v" }
									},
									{ type: "wait_video_workflow" },
									{ type: "save_result" }
								];
								break;
						}

						const accumulated = { topic, triggeredBy: "schedule" };
						await this.schedule(
							cron,
							"executeTask",
							JSON.stringify({ steps, accumulated })
						);
						return `Schedule set: ${flowType} flow every '${cron}' for topic "${topic}"`;
					}
				}),
				listSchedules: tool({
					description: "List all active schedules.",
					inputSchema: z.object({}),
					execute: async (args: any) => {
						const schedules = await this.getSchedules();
						return (
							schedules
								.map(
									(s) => `ID: ${s.id}, payload: ${s.payload}`
								)
								.join("\n") || "No active schedules"
						);
					}
				}),
				cancelSchedule: tool({
					description: "Cancel a running schedule by ID.",
					inputSchema: z.object({
						scheduleId: z.string()
					}),
					execute: async (args: any) => {
						const { scheduleId } = args;
						await this.cancelSchedule(scheduleId);
						return `Schedule ${scheduleId} cancelled`;
					}
				}),
				listPendingReviews: tool({
					description: "List generations pending review.",
					inputSchema: z.object({}),
					execute: async (args: any) => {
						const db = database(this.env.DATABASE);
						const pending =
							await db.query.studioGenerations.findMany({
								where: eq(
									studioGenerations.status,
									"pending_review"
								),
								limit: 10,
								orderBy: desc(studioGenerations.createdAt)
							});
						return (
							pending
								.map(
									(p) =>
										`ID: ${p.id}, Topic: ${p.topic}, Created: ${p.createdAt}`
								)
								.join("\n") || "No pending reviews"
						);
					}
				}),
				getStats: tool({
					description: "Get current flow and schedule statistics.",
					inputSchema: z.object({}),
					execute: async (args: any) => {
						return JSON.stringify(await this.getStats());
					}
				}),
				approveGeneration: tool({
					description: "Approve a generation for publishing.",
					inputSchema: z.object({
						generationId: z.string(),
						scheduledAt: z
							.string()
							.optional()
							.describe(
								"Optional ISO date to schedule the publish"
							)
					}),
					execute: async (args: any) => {
						const { generationId, scheduledAt } = args;
						const db = database(this.env.DATABASE);
						const row = await db.query.studioGenerations.findFirst({
							where: eq(studioGenerations.id, generationId)
						});

						if (!row || row.status !== "pending_review") {
							return "Generation not found or not pending review";
						}

						try {
							await this.env.STUDIO_APPROVE_WORKFLOW.create({
								id: `approve-${generationId}`,
								params: {
									generationId,
									userId: this.name,
									scheduledAt
								}
							});
						} catch (e) {
							// Already in flight
						}

						this.broadcast(
							JSON.stringify({
								type: "approve_started",
								generationId
							})
						);
						return "Memproses approval — akan ada notifikasi saat selesai";
					}
				})
			},
			onFinish: async (event) => {
				await onFinish(event as any);
			},
			stopWhen: stepCountIs(5)
		});

		return result.toUIMessageStreamResponse();
	}

	async onApproveDone(payload: {
		generationId: string;
		postId: string;
		type: string;
	}) {
		await this.saveMessages([
			...this.messages,
			{
				id: crypto.randomUUID(),
				role: "assistant",
				content: `Post created sebagai draft (${payload.type}).\n\n[Buka post →](/posts/${payload.postId})`
			} as any
		]);
		this.broadcast(JSON.stringify({ ...payload, type: "approve_done" }));
	}

	async onApproveFailed(payload: {
		generationId: string;
		step: string;
		error: string;
	}) {
		const db = database(this.env.DATABASE);
		await db
			.update(studioGenerations)
			.set({ status: "pending_review" })
			.where(eq(studioGenerations.id, payload.generationId));

		this.broadcast(JSON.stringify({ type: "approve_failed", ...payload }));

		await this.saveMessages([
			...this.messages,
			{
				id: crypto.randomUUID(),
				role: "assistant",
				content: `Gagal approve di step '${payload.step}': ${payload.error}. Coba lagi?`
			} as any
		]);
	}

	async executeTask(payload: string, _task: Schedule<string>) {
		const data = JSON.parse(payload);

		// If triggered from schedule, there is no flowId yet, we need to create one
		let flowId = data.flowId;
		if (!flowId) {
			const inFlightFlows = (
				Array.from(
					this.sql`SELECT COUNT(*) as count FROM flow_state`
				) as any[]
			)[0].count;
			if (inFlightFlows >= 3) {
				this.broadcast(
					JSON.stringify({
						type: "flow_skipped",
						reason: "max_concurrent_reached",
						activeCount: inFlightFlows
					})
				);
				return;
			}
			flowId = crypto.randomUUID();
			this.sql`
				INSERT INTO flow_state (id, steps, current_step, accumulated, started_at, updated_at)
				VALUES (${flowId}, ${JSON.stringify(data.steps)}, 0, ${JSON.stringify(data.accumulated)}, ${Date.now()}, ${Date.now()})
			`;
		}

		const rows = Array.from(
			this.sql`SELECT * FROM flow_state WHERE id = ${flowId}`
		) as any[];
		if (rows.length === 0) return;
		const flowState = rows[0];

		const steps = JSON.parse(flowState.steps) as FlowStep[];
		const accumulated = JSON.parse(flowState.accumulated) as Record<
			string,
			any
		>;
		const currentStepIndex = flowState.current_step;

		if (currentStepIndex >= steps.length) return;

		const step = steps[currentStepIndex];
		let shouldAdvance = false;
		let nextScheduleDelay = 0;

		try {
			switch (step.type) {
				case "expand_prompt": {
					const workersai = createWorkersAI({ binding: this.env.AI });
					const { text } = await generateText({
						model: workersai(
							"@cf/meta/llama-3.3-70b-instruct-fp8-fast"
						),
						prompt: `Write a highly detailed midjourney style image generation prompt for the following topic: ${accumulated.topic}. Reply with only the prompt, nothing else.`
					});
					accumulated.imagePrompt = text || accumulated.topic;
					shouldAdvance = true;
					nextScheduleDelay = 0;
					break;
				}
				case "generate_image": {
					const instance = await this.env.VIO_IMAGE_WORKFLOW.create({
						params: {
							prompt:
								accumulated.imagePrompt || accumulated.topic,
							model: step.params.model as any,
							aspect_ratio: "16:9",
							count: 1
						}
					});
					accumulated.imageWorkflowId = instance.id;
					shouldAdvance = true;
					nextScheduleDelay = 20;
					break;
				}
				case "wait_image_workflow": {
					const instance = await this.env.VIO_IMAGE_WORKFLOW.get(
						accumulated.imageWorkflowId
					);
					const status = await instance.status();
					if (
						status.status === "running" ||
						status.status === "queued" ||
						status.status === "waiting"
					) {
						shouldAdvance = false;
						nextScheduleDelay = 15;
					} else if (status.status === "complete") {
						const output = status.output as any;
						accumulated.imageUrl =
							output?.[0]?.asset_url ?? output?.asset_url;
						shouldAdvance = true;
						nextScheduleDelay = 0;
					} else if (status.status === "errored") {
						return await this.failFlow(
							flowId,
							step.type,
							(status.error as any)?.message ?? "Workflow errored"
						);
					}
					break;
				}
				case "upload_asset": {
					const res = await fetch(accumulated.imageUrl);
					const blob = await res.blob();
					const asset = await new VioService(
						this.env.VIO_API_KEY
					).uploadAsset(blob);
					accumulated.imageAssetId = asset.asset_id;
					shouldAdvance = true;
					nextScheduleDelay = 0;
					break;
				}
				case "generate_loop_prompt": {
					const workersai = createWorkersAI({ binding: this.env.AI });
					const { text } = await generateText({
						model: workersai(
							"@cf/meta/llama-3.3-70b-instruct-fp8-fast"
						),
						prompt: `Topic: ${accumulated.topic}. Image prompt: ${accumulated.imagePrompt ?? accumulated.topic}. Write a short animation prompt describing how this image should move in a seamless loop (e.g., "camera slowly panning, embers floating upward"). Reply with only the prompt, nothing else.`
					});
					accumulated.loopingPrompt =
						text || accumulated.imagePrompt || accumulated.topic;
					shouldAdvance = true;
					nextScheduleDelay = 0;
					break;
				}
				case "generate_video": {
					let startFrameRef = step.params.startFrameRef;
					let endFrameRef = step.params.endFrameRef;
					let start_frame_asset_id: string | undefined = undefined;
					let end_frame_asset_id: string | undefined = undefined;

					const resolveRef = (ref?: string) => {
						if (!ref) return undefined;
						if (ref.startsWith("@")) {
							const alias = ref.substring(1);
							return accumulated.userAssets?.[alias];
						}
						return ref;
					};

					start_frame_asset_id = resolveRef(startFrameRef);
					end_frame_asset_id = resolveRef(endFrameRef);

					if (!start_frame_asset_id) {
						start_frame_asset_id = accumulated.imageAssetId;
					}

					const videoPrompt =
						accumulated.loopingPrompt ||
						accumulated.imagePrompt ||
						accumulated.topic ||
						"cinematic loop";
					const params: any = {
						prompt: videoPrompt,
						model: step.params.model,
						mode: step.params.mode
					};

					if (step.params.mode.includes("i2v")) {
						params.start_frame_asset_id = start_frame_asset_id;
						if (end_frame_asset_id) {
							params.end_frame_asset_id = end_frame_asset_id;
						}
					}

					const instance = await this.env.VIO_VIDEO_WORKFLOW.create({
						params
					});
					accumulated.videoWorkflowId = instance.id;
					shouldAdvance = true;
					nextScheduleDelay = 30;
					break;
				}
				case "wait_video_workflow": {
					const instance = await this.env.VIO_VIDEO_WORKFLOW.get(
						accumulated.videoWorkflowId
					);
					const status = await instance.status();
					if (
						status.status === "running" ||
						status.status === "queued" ||
						status.status === "waiting"
					) {
						shouldAdvance = false;
						nextScheduleDelay = 15;
					} else if (status.status === "complete") {
						// @ts-ignore
						accumulated.videoUrl = status.output.asset_url;
						shouldAdvance = true;
						nextScheduleDelay = 0;
					} else if (status.status === "errored") {
						return await this.failFlow(
							flowId,
							step.type,
							status.error?.message || "Workflow errored"
						);
					}
					break;
				}
				case "save_result": {
					const db = database(this.env.DATABASE);
					const generationId = crypto.randomUUID();
					await db.insert(studioGenerations).values({
						id: generationId,
						topic: accumulated.topic,
						imageUrl: accumulated.imageUrl,
						videoUrl: accumulated.videoUrl || null,
						imagePrompt: accumulated.imagePrompt,
						videoPrompt: accumulated.loopingPrompt || null,
						status: "pending_review",
						createdAt: new Date()
					});

					if (accumulated.triggeredBy === "manual") {
						await this.saveMessages([
							...this.messages,
							{
								id: crypto.randomUUID(),
								role: "assistant",
								content: `Selesai!\n\n![${accumulated.topic}](${accumulated.imageUrl})\n\n...Mau langsung publish?`,
								annotations: [
									{ type: "generation", generationId }
								]
							} as any
						]);
					} else if (accumulated.triggeredBy === "schedule") {
						await this.saveMessages([
							...this.messages,
							{
								id: crypto.randomUUID(),
								role: "assistant",
								content: `Scheduled generation selesai!\n\nTopic: **${accumulated.topic}**\n\n![${accumulated.topic}](${accumulated.imageUrl})\n\nGenerasi ini sudah masuk review queue — gunakan \`approveGeneration\` atau buka Studio untuk approve.`,
								annotations: [
									{ type: "generation", generationId }
								]
							} as any
						]);
					}

					this.sql`DELETE FROM flow_state WHERE id = ${flowId}`;
					this.broadcast(
						JSON.stringify({
							type: "flow_done",
							topic: accumulated.topic,
							imageUrl: accumulated.imageUrl,
							videoUrl: accumulated.videoUrl,
							mode: accumulated.triggeredBy
						})
					);
					return; // Flow is done
				}
			}

			if (shouldAdvance) {
				const nextStepIndex = currentStepIndex + 1;
				this.sql`
					UPDATE flow_state
					SET current_step = ${nextStepIndex}, accumulated = ${JSON.stringify(accumulated)}, updated_at = ${Date.now()}
					WHERE id = ${flowId}
				`;

				this.broadcast(
					JSON.stringify({
						type: "flow_progress",
						flowId,
						stepType: step.type,
						stepIndex: currentStepIndex,
						totalSteps: steps.length
					})
				);

				if (nextStepIndex < steps.length) {
					await this.schedule(
						nextScheduleDelay,
						"executeTask",
						JSON.stringify({ flowId })
					);
				}
			} else {
				// Retry the current step wait
				await this.schedule(
					nextScheduleDelay,
					"executeTask",
					JSON.stringify({ flowId })
				);
			}
		} catch (error: any) {
			console.error("Execute step error:", error);
			await this.failFlow(flowId, step.type, error.message);
		}
	}

	async failFlow(flowId: string, stepType: string, error: string) {
		this.sql`DELETE FROM flow_state WHERE id = ${flowId}`;
		this.broadcast(
			JSON.stringify({
				type: "flow_failed",
				flowId,
				stepType,
				error
			})
		);
	}
}
