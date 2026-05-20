import type { PaymentPlan } from "@workspace/core";

export const appConfig = {
	name: "Leith",
	version: "1.0.0",
	supportEmail: "support@leith.so",

	authDefaultRedirect: "/",

	payments: [
		{
			productId: "pdt_allaccess_replace_me",
			slug: "all-access",
			name: "All Access",
			description:
				"Unlimited downloads of every background — free and premium — forever.",
			price: "$29",
			currency: "USD",
			interval: "one-time",
			type: "standard",
			features: [
				"Unlimited downloads, forever",
				"All current and future backgrounds",
				"MP4, PNG, JPG, WebP formats",
				"1080p and 4K resolutions",
				"Seamless loop videos",
				"Stream-ready Twitch & YouTube assets",
				"New drops added regularly",
				"No subscription, no renewal"
			],
			cta: "Get All Access",
			popular: true,
			footer: "Pay once. Download forever."
		}
	]
} as const satisfies {
	name: string;
	version: string;
	supportEmail?: string;
	authDefaultRedirect: string;
	payments: readonly PaymentPlan[];
};

export type AppConfig = typeof appConfig;
export type PricingPlan = (typeof appConfig.payments)[number];
