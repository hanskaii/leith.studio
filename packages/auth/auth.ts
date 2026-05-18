import { apiKey } from "@better-auth/api-key";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { database } from "@workspace/database";
import * as schema from "@workspace/database/schema";
import { admin, emailOTP, multiSession, oneTap } from "better-auth/plugins";
import {
	dodopayments,
	checkout,
	portal,
	webhooks,
	usage
} from "@dodopayments/better-auth";
import DodoPayments from "dodopayments";
import { createMailer } from "./emails/mailer";
import { getDatabaseHooks } from "./hooks/database.hooks";
import { getPaymentHooks } from "./hooks/payment.hooks";
import { App } from "@workspace/core";

export interface AuthEnv {
	DATABASE: D1Database;
	SESSION_KV: KVNamespace;
	BETTER_AUTH_SECRET: string;
	BETTER_AUTH_URL: string;
	GOOGLE_CLIENT_ID: string;
	GOOGLE_CLIENT_SECRET: string;
	RESEND_API_KEY: string;
	RESEND_FROM_EMAIL: string;
	APP_NAME: string;
	APP_ENV: string;
	CORS_ORIGIN?: string;
	SESSION_DOMAIN?: string;
	DODO_PAYMENTS_API_KEY: string;
	DODO_PAYMENTS_WEBHOOK_SECRET: string;
}

export const getAuth = (env: AuthEnv) => {
	const mailer = env.APP_ENV === "production" ? createMailer(env) : null;
	return betterAuth({
		database: drizzleAdapter(database(env.DATABASE), {
			provider: "sqlite",
			schema: {
				user: schema.users,
				session: schema.sessions,
				account: schema.accounts,
				verification: schema.verifications,
				apikey: schema.apiKeys
			},
			usePlural: false
		}),
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		trustedOrigins: [
			"http://localhost:5173",
			"http://localhost:4000",
			...(env.CORS_ORIGIN ? env.CORS_ORIGIN.split(",") : [])
		],
		trustedProxies: true,
		socialProviders: {
			google: {
				prompt: "select_account",
				clientId: env.GOOGLE_CLIENT_ID || "",
				clientSecret: env.GOOGLE_CLIENT_SECRET || ""
			}
		},
		secondaryStorage: {
			get: async (key: string) => {
				const value = await env.SESSION_KV?.get(key);
				return value ?? null;
			},
			set: async (key: string, value: string, ttl?: number) => {
				if (ttl) {
					await env.SESSION_KV?.put(key, value, {
						expirationTtl: ttl
					});
				} else {
					await env.SESSION_KV?.put(key, value);
				}
			},
			delete: async (key: string) => {
				await env.SESSION_KV?.delete(key);
			}
		},
		plugins: [
			oneTap({
				clientId: env.GOOGLE_CLIENT_ID || ""
			}),
			admin(),
			multiSession({
				maximumSessions: 5
			}),
			apiKey({
				rateLimit: {
					enabled: true
				},
				enableMetadata: true,
				apiKeyHeaders: ["Authorization", "x-api-key"]
			}),
			emailOTP({
				async sendVerificationOTP({ email, otp, type }) {
					if (env.APP_ENV === "development") {
						console.log(
							`[OTP] Sending verification code to ${email}: ${otp}`
						);
						return;
					}

					if (type === "sign-in") {
						await mailer!.sendOTP(email, otp);
					}
				}
			}),
			dodopayments({
				client: new DodoPayments({
					bearerToken: env.DODO_PAYMENTS_API_KEY || "",
					environment:
						env.APP_ENV === "production" ? "live_mode" : "test_mode"
				}),
				createCustomerOnSignUp: true,
				use: [
					checkout({
						products: App.getPayments(),
						successUrl: "/account/billing"
					}),
					portal(),
					webhooks(getPaymentHooks(env)),
					usage()
				]
			})
		],
		advanced: {
			useSecureCookies: env.APP_ENV === "production",
			crossSubDomainCookies: {
				enabled: !!env.SESSION_DOMAIN,
				domain: env.SESSION_DOMAIN
			}
		},
		databaseHooks: getDatabaseHooks(env),
		rateLimit: {
			storage: "secondary-storage"
		},
		user: {
			additionalFields: {
				username: {
					type: "string",
					required: false
				},
				dodoCustomerId: {
					type: "string",
					required: false
				},
				subscriptionStatus: {
					type: "string",
					required: false
				},
				subscriptionId: {
					type: "string",
					required: false
				},
				subscriptionPlanId: {
					type: "string",
					required: false
				},
				credits: {
					type: "number",
					required: false
				}
			}
		}
	});
};

export type Auth = ReturnType<typeof getAuth>;
export type User = Auth["$Infer"]["Session"]["user"];
export type Session = Auth["$Infer"]["Session"]["session"];
