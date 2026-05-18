import { z } from "zod";

export const EnvSchema = z.object({
	// Auth
	BETTER_AUTH_SECRET: z
		.string()
		.min(32, "BETTER_AUTH_SECRET must be at least 32 chars"),
	BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),
	GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
	GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),

	// Email
	RESEND_API_KEY: z
		.string()
		.startsWith("re_", "RESEND_API_KEY must start with re_"),
	RESEND_FROM_EMAIL: z
		.string()
		.email("RESEND_FROM_EMAIL must be a valid email"),

	// Payments
	DODO_PAYMENTS_API_KEY: z
		.string()
		.min(1, "DODO_PAYMENTS_API_KEY is required"),
	DODO_PAYMENTS_WEBHOOK_SECRET: z
		.string()
		.min(1, "DODO_PAYMENTS_WEBHOOK_SECRET is required"),

	// App
	APP_NAME: z.string().min(1, "APP_NAME is required"),
	APP_ENV: z.enum(["development", "staging", "production"])
});

export type ValidatedEnv = z.infer<typeof EnvSchema>;
