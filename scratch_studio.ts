import { AIChatAgent } from "@cloudflare/ai-chat";
import { type Schedule, callable } from "agents";
import { createWorkersAI } from "workers-ai-provider";
import { database, studioGenerations, eq, desc } from "@workspace/database";
import { VioService } from "../services/vio.service";
import {
	streamText,
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
			model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
			system: `You are a Studio Agent. Your role is to generate images and videos via workflows.
Models available for image: 'flux-1-schnell', 'flux-1-dev'.
Models available for video: 'kling-v3', 'minimax'.
Flow composition rules: never call tools without a model specified, always present options to the user first if underspecified.
Current stats: ${stats.inFlightFlows} in flight, ${stats.pendingReviews} pending reviews, ${stats.activeSchedules} active schedules.
Today's date: ${new Date().toISOString()}.${systemNote}`,
			messages: pruneMessages({
				messages: await convertToModelMessages(this.messages),
				toolCalls: "before-last-2-messages"
			}),
			tools: {
				runFlowNow: tool({
					description:
						"Trigger a new generation flow immediately. Requires 'topic' and 'steps' array.",
					parameters: z.object({
						topic: z.string(),
						steps: z
							.array(z.any())
							.describe("Array of flow steps to execute.")
					}),
					execute: async ({ topic, steps }) => {
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
									userAssets[`image-${i + 1}`] =
										asset.asset_id;
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
						"Set a recurring schedule for generation flows.",
					parameters: z.object({
						cron: z
							.string()
							.describe("Cron expression for the schedule"),
						topic: z.string(),
						steps: z
							.array(z.any())
							.describe("Array of flow steps to execute.")
					}),
					execute: async ({ cron, topic, steps }) => {
						const accumulated = { topic, triggeredBy: "schedule" };
						await this.schedule(
							cron,
							"executeTask",
							JSON.stringify({ steps, accumulated })
						);
						return `Schedule set with cron: ${cron}`;
					}
				}),
				listSchedules: tool({
					description: "List all active schedules.",
					parameters: z.object({}),
					execute: async () => {
						const schedules = await this.getSchedules();
						return (
							schedules
								.map(
									(s) =>
										`ID: ${s.id}, next fire: ${new Date(s.timestamp).toISOString()}, description: ${s.description || "none"}`
								)
								.join("\n") || "No active schedules"
						);
					}
				}),
				cancelSchedule: tool({
					description: "Cancel a running schedule by ID.",
					parameters: z.object({
						scheduleId: z.string()
					}),
					execute: async ({ scheduleId }) => {
						await this.cancelSchedule(scheduleId);
						return `Schedule ${scheduleId} cancelled`;
					}
				}),
				listPendingReviews: tool({
					description: "List generations pending review.",
					parameters: z.object({}),
					execute: async () => {
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
					parameters: z.object({}),
					execute: async () => {
						return JSON.stringify(await this.getStats());
					}
				}),
				approveGeneration: tool({
					description: "Approve a generation for publishing.",
					parameters: z.object({
						generationId: z.string(),
						scheduledAt: z
							.string()
							.optional()
							.describe(
								"Optional ISO date to schedule the publish"
							)
					}),
					execute: async ({ generationId, scheduledAt }) => {
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
			maxSteps: 10,
			onFinish: async (event) => {
				await onFinish(event);
			}
		});

		return result.toDataStreamResponse();
	}

	@callable()
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
		this.broadcast(JSON.stringify({ type: "approve_done", ...payload }));
	}

	@callable()
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
					const ai = createWorkersAI({ binding: this.env.AI });
					const res = await ai(
						"@cf/meta/llama-3.3-70b-instruct-fp8-fast",
						{
							messages: [
								{
									role: "user",
									content: `Write a highly detailed midjourney style image generation prompt for the following topic: ${accumulated.topic}. Reply with only the prompt.`
								}
							]
						}
					);
					// @ts-ignore
					accumulated.imagePrompt = res.response;
					shouldAdvance = true;
					nextScheduleDelay = 0;
					break;
				}
				case "generate_image": {
					const instance = await this.env.VIO_IMAGE_WORKFLOW.create({
						params: {
							prompt: accumulated.imagePrompt,
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
						// @ts-ignore
						accumulated.imageUrl =
							status.output[0]?.asset_url ||
							status.output?.asset_url;
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
					const ai = createWorkersAI({ binding: this.env.AI });
					const res = await ai(
						"@cf/meta/llama-3.3-70b-instruct-fp8-fast",
						{
							messages: [
								{
									role: "user",
									content: `Topic: ${accumulated.topic}. Image prompt: ${accumulated.imagePrompt}. Write a short prompt describing how this image should animate in a seamless loop (e.g., 'camera panning slowly, dust motes floating'). Reply with only the prompt.`
								}
							]
						}
					);
					// @ts-ignore
					accumulated.loopingPrompt = res.response;
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

					const params: any = {
						prompt: accumulated.loopingPrompt || accumulated.topic,
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
