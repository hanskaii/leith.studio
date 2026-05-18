import type { PaymentPlan } from "@workspace/core";

export const appConfig = {
	name: "Tanflare",
	version: "1.0.0",
	supportEmail: "support@tanflare.com",

	authDefaultRedirect: "/overview",

	payments: [
		{
			productId: "pdt_starter_replace_me",
			slug: "starter",
			name: "Starter",
			description:
				"Everything you need to ship your edge-native SaaS in hours.",
			price: "$199",
			originalPrice: "$299",
			currency: "USD",
			interval: "one-time",
			type: "standard",
			features: [
				"TanStack Start Boilerplate",
				"Cloudflare Workers & D1",
				"Better Auth Integration",
				"Dodo Payments Setup",
				"Drizzle ORM Schema",
				"Hono API Framework",
				"Google OAuth & Magic Links",
				"Components & Animations",
				"SEO & Blog Template",
				"Lifetime Updates"
			],
			cta: "Get Tanflare Starter",
			popular: false,
			footer: "Pay once. Build unlimited projects!"
		},
		{
			productId: "pdt_pro_replace_me",
			slug: "pro-subscription",
			name: "Pro",
			description:
				"Scale your business with advanced features and priority support.",
			price: "$29",
			currency: "USD",
			interval: "month",
			type: "standard",
			features: [
				"All Starter features",
				"Advanced Org Management",
				"Role-Based Access (RBAC)",
				"Priority Email Support",
				"Discord Community Access",
				"Premium UI Components"
			],
			cta: "Start Pro Trial",
			popular: true,
			footer: "14-day free trial included."
		},
		{
			productId: "pdt_credits_replace_me",
			slug: "prepaid-credits",
			name: "Prepaid Credits",
			description:
				"Top up credits anytime — never run out mid-conversation.",
			price: "$49",
			currency: "USD",
			interval: "one-time",
			type: "credits",
			unit: "10k tokens",
			creditAmount: 10000,
			features: [
				"10,000 AI tokens",
				"Credits never expire",
				"Usable for all AI features",
				"Easy top-up anytime",
				"Bulk purchase discounts",
				"Detailed usage ledger"
			],
			cta: "Buy Credits",
			popular: false,
			footer: "Credits added instantly to your account."
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
