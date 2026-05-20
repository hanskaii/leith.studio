import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { VioService } from "../services/vio.service";
import type { Generation } from "../services/vio.service";
import type { HonoEnv } from "../types/hono.types";

type Env = HonoEnv["Bindings"];

export type VioUpscaleParams = {
	type: "image" | "video";
	generationId: number;
};

function sleepDuration(attempt: number): string {
	if (attempt < 5) return "3 seconds";
	if (attempt < 15) return "5 seconds";
	return "10 seconds";
}

export class VioUpscaleWorkflow extends WorkflowEntrypoint<
	Env,
	VioUpscaleParams
> {
	async run(
		event: WorkflowEvent<VioUpscaleParams>,
		step: WorkflowStep
	): Promise<Generation> {
		const { type, generationId } = event.payload;
		const vio = new VioService(this.env.VIO_API_KEY);

		// 1. Submit upscale
		const { generation_id } = await step.do("submit", () =>
			type === "image"
				? vio.upscaleImage(generationId)
				: vio.upscaleVideo(generationId)
		);

		// 2. Poll until done
		let gen = await step.do("fetch", () =>
			vio.getGeneration(generation_id)
		);

		let attempt = 0;
		while (
			gen.status !== "completed" &&
			gen.status !== "failed" &&
			attempt < 30
		) {
			await step.sleep(`wait-${attempt}`, sleepDuration(attempt));
			gen = await step.do(`poll-${attempt}`, () =>
				vio.getGeneration(generation_id)
			);
			attempt++;
		}

		return gen;
	}
}
