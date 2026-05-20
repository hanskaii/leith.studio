import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { VioService } from "../services/vio.service";
import type { Generation } from "../services/vio.service";
import type { GenerateVideoParams } from "../services/vio.service";
import type { HonoEnv } from "../types/hono.types";

type Env = HonoEnv["Bindings"];

export type VioVideoParams = GenerateVideoParams & {
	/** Upscale the completed video to 1080p after generation */
	autoUpscale?: boolean;
	/** Extend the completed video with a follow-up prompt */
	extendPrompt?: string;
};

function sleepDuration(attempt: number): string {
	if (attempt < 5) return "3 seconds";
	if (attempt < 15) return "5 seconds";
	return "10 seconds";
}

async function pollUntilDone(
	step: WorkflowStep,
	vio: VioService,
	genId: number,
	prefix: string,
	maxAttempts = 60
): Promise<Generation> {
	let gen = await step.do(`${prefix}-fetch`, () => vio.getGeneration(genId));

	let attempt = 0;
	while (
		gen.status !== "completed" &&
		gen.status !== "failed" &&
		attempt < maxAttempts
	) {
		await step.sleep(`${prefix}-wait-${attempt}`, sleepDuration(attempt));
		gen = await step.do(`${prefix}-poll-${attempt}`, () =>
			vio.getGeneration(genId)
		);
		attempt++;
	}

	return gen;
}

export class VioVideoWorkflow extends WorkflowEntrypoint<Env, VioVideoParams> {
	async run(
		event: WorkflowEvent<VioVideoParams>,
		step: WorkflowStep
	): Promise<Generation> {
		const { autoUpscale, extendPrompt, ...videoParams } = event.payload;
		const vio = new VioService(this.env.VIO_API_KEY);

		// 1. Submit video generation
		const { generation_ids } = await step.do("submit", () =>
			vio.generateVideo(videoParams)
		);
		const genId = generation_ids[0];

		// 2. Poll until done
		let gen = await pollUntilDone(step, vio, genId, "generate");

		// 3. Optional extend
		if (gen.status === "completed" && extendPrompt) {
			const extended = await step.do("extend-submit", () =>
				vio.extendVideo(genId, { prompt: extendPrompt })
			);

			gen = await pollUntilDone(
				step,
				vio,
				extended.generation_id,
				"extend"
			);
		}

		// 4. Optional upscale
		if (gen.status === "completed" && autoUpscale) {
			const upscale = await step.do("upscale-submit", () =>
				vio.upscaleVideo(gen.id)
			);

			gen = await pollUntilDone(
				step,
				vio,
				upscale.generation_id,
				"upscale"
			);
		}

		return gen;
	}
}
