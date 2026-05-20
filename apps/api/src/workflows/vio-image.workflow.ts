import { WorkflowEntrypoint } from "cloudflare:workers";
import type {
	WorkflowEvent,
	WorkflowStep,
	WorkflowSleepDuration
} from "cloudflare:workers";
import { VioService } from "../services/vio.service";
import type {
	GenerateImageParams,
	Generation,
	UpscaleResponse
} from "../services/vio.service";
import type { HonoEnv } from "../types/hono.types";

type Env = HonoEnv["Bindings"];

export type VioImageParams = GenerateImageParams & {
	/** If true, upscale each completed generation to 4K (nano-banana-2 / nano-banana-pro only) */
	autoUpscale?: boolean;
};

function sleepDuration(attempt: number): WorkflowSleepDuration {
	if (attempt < 5) return "3 seconds";
	if (attempt < 15) return "5 seconds";
	return "10 seconds";
}

export class VioImageWorkflow extends WorkflowEntrypoint<Env, VioImageParams> {
	async run(
		event: WorkflowEvent<VioImageParams>,
		step: WorkflowStep
	): Promise<Generation[]> {
		const { autoUpscale, ...imageParams } = event.payload;
		const vio = new VioService(this.env.VIO_API_KEY);

		// 1. Submit image generation
		const { generation_ids } = await step.do("submit", async () =>
			vio.generateImage(imageParams)
		);

		// 2. Poll every generation_id until all are settled
		const results: Generation[] = [];

		for (const genId of generation_ids) {
			let gen = await step.do(`fetch-${genId}`, () =>
				vio.getGeneration(genId)
			);

			let attempt = 0;
			while (
				gen.status !== "completed" &&
				gen.status !== "failed" &&
				attempt < 60
			) {
				await step.sleep(
					`wait-${genId}-${attempt}`,
					sleepDuration(attempt)
				);
				gen = await step.do(`poll-${genId}-${attempt}`, () =>
					vio.getGeneration(genId)
				);
				attempt++;
			}

			// 3. Optional upscale after completion
			if (gen.status === "completed" && autoUpscale) {
				const upscale = await step.do(
					`upscale-submit-${genId}`,
					(): Promise<UpscaleResponse> => vio.upscaleImage(genId)
				);

				let upscaleGen = await step.do(
					`upscale-fetch-${upscale.generation_id}`,
					() => vio.getGeneration(upscale.generation_id)
				);

				let uAttempt = 0;
				while (
					upscaleGen.status !== "completed" &&
					upscaleGen.status !== "failed" &&
					uAttempt < 30
				) {
					await step.sleep(
						`upscale-wait-${upscale.generation_id}-${uAttempt}`,
						sleepDuration(uAttempt)
					);
					upscaleGen = await step.do(
						`upscale-poll-${upscale.generation_id}-${uAttempt}`,
						() => vio.getGeneration(upscale.generation_id)
					);
					uAttempt++;
				}

				results.push(upscaleGen);
			} else {
				results.push(gen);
			}
		}

		return results;
	}
}
