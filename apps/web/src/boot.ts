import { Gate, App, allow } from "@workspace/core";
import "@workspace/config";
import { appConfig } from "@workspace/config";

export const boot = () => {
	App.configure(appConfig);
	App.payments([...appConfig.payments]);

	Gate.before(async (_action, ctx) => {
		if ((ctx as any).role === "admin") return allow();
	});

	App.features({
		enableAiChat: true,
		newDashboard: false
	});

	Gate.after("payment.succeeded", () => {
		console.log("Welcome to Pro!");
	});

	console.log(`🌐 Web System Booted: ${App.getConfig().name}`);
};
