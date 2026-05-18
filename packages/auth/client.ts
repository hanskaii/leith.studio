import { createAuthClient } from "better-auth/react";
import { apiKeyClient } from "@better-auth/api-key/client";
import {
	adminClient,
	emailOTPClient,
	lastLoginMethodClient,
	multiSessionClient,
	oneTapClient
} from "better-auth/client/plugins";
import { dodopaymentsClient } from "@dodopayments/better-auth";

export interface AuthClientConfig {
	baseURL: string;
	googleClientId?: string;
}

export const getAuthClient = (config: AuthClientConfig) => {
	return createAuthClient({
		baseURL: config.baseURL,
		plugins: [
			oneTapClient({
				clientId: config.googleClientId || "",
				uxMode: "popup",
				autoSelect: false,
				cancelOnTapOutside: true,
				context: "signin",
				promptOptions: {
					baseDelay: 1000,
					maxAttempts: 5
				}
			}),
			apiKeyClient(),
			adminClient(),
			multiSessionClient(),
			emailOTPClient(),
			lastLoginMethodClient(),
			dodopaymentsClient()
		],
		fetchOptions: {
			credentials: "include"
		}
	});
};
