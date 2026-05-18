interface AppConfig {
	name: string;
	version: string;
	supportEmail?: string;
	logo?: string;
}

interface FeatureFlags {
	[key: string]: boolean;
}

interface BasePlan {
	productId: string;
	slug: string;
	name: string;
	description: string;
	price: string;
	currency: string;
	features: readonly string[];
	cta: string;
	popular: boolean;
	footer: string;
}

/**
 * Discriminated union for payment plans.
 * Use `type` as the discriminant when narrowing in handlers or boot logic.
 *
 * @example
 * if (plan.type === "usage") { plan.meterId } // narrowed
 */
export type PaymentPlan =
	| (BasePlan & {
			type: "standard";
			interval: "month" | "year" | "one-time";
			originalPrice?: string;
	  })
	| (BasePlan & {
			type: "credits";
			interval: "one-time";
			unit: string;
			creditAmount: number;
	  });

export class App {
	private static config: AppConfig = {
		name: "Tanflare",
		version: "1.0.0"
	};

	private static featureFlags: FeatureFlags = {};
	private static paymentProducts: PaymentPlan[] = [];

	static configure(config: Partial<AppConfig>) {
		this.config = { ...this.config, ...config };
	}

	static getConfig() {
		return this.config;
	}

	static features<T extends Record<string, boolean>>(flags: T) {
		this.featureFlags = { ...this.featureFlags, ...flags };
	}

	static hasFeature<
		T extends Record<string, boolean> = Record<string, boolean>,
		K extends keyof T & string = string
	>(key: K): boolean {
		return !!this.featureFlags[key];
	}

	static payments(products: PaymentPlan[]) {
		this.paymentProducts = products;
	}

	static getPayments(): PaymentPlan[] {
		return this.paymentProducts;
	}
}
