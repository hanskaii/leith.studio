import { WorkflowEntrypoint } from "cloudflare:workers";
import type {
	WorkflowEvent,
	WorkflowStep,
	WorkflowSleepDuration
} from "cloudflare:workers";
import { VioService } from "../services/vio.service";
import type { MotionControlParams, Generation } from "../services/vio.service";
import type { HonoEnv } from "../types/hono.types";

type Env = HonoEnv["Bindings"];

export type VioMotionControlParams = MotionControlParams;

function sleepDuration(attempt: number): WorkflowSleepDuration {
	if (attempt < 5) return "5 seconds";
	if (attempt < 20) return "10 seconds";
	return "15 seconds";
}

export class VioMotionControlWorkflow extends WorkflowEntrypoint<
	Env,
	VioMotionControlParams
> {
	async run(
		event: WorkflowEvent<VioMotionControlParams>,
		step: WorkflowStep
	): Promise<Generation> {
		const vio = new VioService(this.env.VIO_API_KEY);

		// 1. Submit motion control job
		const { generation_id } = await step.do("submit", () =>
			vio.motionControl(event.payload)
		);

		// 2. Poll — off-peak can take up to 24h, so allow up to 200 attempts
		const maxAttempts = event.payload.off_peak ? 200 : 60;

		let gen = await step.do("fetch", () =>
			vio.getGeneration(generation_id)
		);

		let attempt = 0;
		while (
			gen.status !== "completed" &&
			gen.status !== "failed" &&
			attempt < maxAttempts
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
