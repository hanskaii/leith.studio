import { getAuthClient } from "@workspace/auth/client";

export const authClient = getAuthClient({
	baseURL: import.meta.env.VITE_API_URL,
	googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID
});

export const { signIn, signOut, signUp, useSession } = authClient;
