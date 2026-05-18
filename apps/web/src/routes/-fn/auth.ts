import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { toast } from "@workspace/ui";
import type { Session, User } from "@workspace/auth";
import { useState } from "react";
import { authClient } from "@/auth/client";
import { getApi, postApi, createApiClient } from "@/routes/-fn/api-client";

const SESSION_STALE_TIME = 1000 * 60 * 5;

/**
 * MANUAL INTERFACES (Allowed as exceptions for Better Auth routes)
 */
export interface DodoSubscription {
	subscriptionId: string;
	productName?: string;
	planName?: string;
	status: string;
	createdAt?: string | Date;
	startDate?: string | Date;
	currentPeriodEnd?: string | Date;
	amount?: number;
	currency?: string;
	interval?: string;
}

export interface DodoPayment {
	paymentId: string;
	payment_id?: string;
	id?: string;
	amount: number;
	currency: string;
	status: string;
	createdAt: string | Date;
	productName?: string;
}

export interface ApiKey {
	id: string;
	name: string;
	prefix: string;
	createdAt: string | number | Date;
	lastRequest?: string | number | Date;
}

export interface AuthAccount {
	id: string;
	userId: string;
	providerId: string;
	accountId: string;
	createdAt: string | Date;
	updatedAt: string | Date;
}

// ─── Session & Auth ──────────────────────────────────────────────────────────

export const getSessionFn = createServerFn({ method: "GET" }).handler(
	async () => {
		try {
			const response = await getApi("/api/auth/get-session");

			const setCookies = response.headers.getSetCookie();
			if (setCookies && setCookies.length > 0) {
				setResponseHeader("Set-Cookie", setCookies);
			}

			if (!response.ok) {
				return null;
			}
			const data = (await response.json()) as {
				session: Session;
				user: User;
			};

			return data;
		} catch (error) {
			console.error("Get session failed:", error);
			return null;
		}
	}
);

export const sessionsOptions = () =>
	queryOptions({
		queryKey: ["user"],
		queryFn: ({ signal }) => getSessionFn({ signal }),
		staleTime: SESSION_STALE_TIME,
		refetchInterval: SESSION_STALE_TIME,
		refetchOnMount: "always",
		refetchOnWindowFocus: true,
		refetchOnReconnect: true
	});

export const useLogoutMutation = () => {
	const queryClient = useQueryClient();
	const router = useRouter();
	const [isPending, setIsPending] = useState(false);

	const logout = async () => {
		setIsPending(true);
		try {
			await authClient.signOut();
			queryClient.clear();
			await router.navigate({ to: "/login" });
			toast.success("Logged out successfully");
		} catch (error) {
			console.error("Logout failed:", error);
			toast.error("Failed to log out");
		} finally {
			setIsPending(false);
		}
	};

	return { logout, isPending };
};

export const listSessionsFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<Session[]> => {
		try {
			const response = await getApi("/api/auth/list-sessions");

			if (!response.ok) {
				throw new Error(`Failed to fetch sessions: ${response.status}`);
			}

			const data = await response.json();
			return data as Session[];
		} catch (error) {
			console.error("List sessions failed:", error);
			throw error;
		}
	}
);

export const sessionsListOptions = () =>
	queryOptions({
		queryKey: ["sessions"],
		queryFn: () => listSessionsFn()
	});

export const listAccountsFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<AuthAccount[]> => {
		try {
			const response = await getApi("/api/auth/list-accounts");

			if (!response.ok) {
				throw new Error(`Failed to fetch accounts: ${response.status}`);
			}

			const data = await response.json();
			return data as AuthAccount[];
		} catch (error) {
			console.error("List accounts failed:", error);
			return [];
		}
	}
);

export const accountsListOptions = () =>
	queryOptions({
		queryKey: ["auth", "accounts"],
		queryFn: () => listAccountsFn()
	});

// ─── Uploads (Uses RPC Contract) ─────────────────────────────────────────────

export const uploadAvatarFn = createServerFn({ method: "POST" })
	.inputValidator((data: FormData) => data)
	.handler(async ({ data }) => {
		const file = data.get("file") as File;
		if (!file) throw new Error("No file provided");

		const api = createApiClient();
		const res = await api.api.upload.avatar.$post({ form: { file } });

		if (!res.ok) {
			const err = (await res.json()) as { message?: string };
			throw new Error(err.message || "Upload failed");
		}

		const { data: result } = await res.json();
		return result.url;
	});

export const uploadImageFn = createServerFn({ method: "POST" })
	.inputValidator((data: FormData) => data)
	.handler(async ({ data }) => {
		const file = data.get("file") as File;
		if (!file) throw new Error("No file provided");

		const api = createApiClient();
		const res = await api.api.upload.image.$post({ form: { file } });

		if (!res.ok) {
			const err = (await res.json()) as { message?: string };
			throw new Error(err.message || "Upload failed");
		}

		const { data: result } = await res.json();
		return result.url;
	});

// ─── API Keys ────────────────────────────────────────────────────────────────

export const listApiKeysFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const res = await getApi("/api/auth/api-key/list");
		const json = (await res.json()) as { apiKeys?: ApiKey[] };
		return (json.apiKeys ?? []) as ApiKey[];
	}
);

export const createApiKeyFn = createServerFn({ method: "POST" })
	.inputValidator((name: string) => name)
	.handler(async ({ data: name }) => {
		const res = await postApi("/api/auth/api-key/create", { name });

		if (!res.ok) {
			const text = await res.text().catch(() => "");
			throw new Error(
				`Failed to create API key: ${res.status} ${text || res.statusText}`
			);
		}

		const json = (await res.json()) as { key?: string };
		if (!json.key) {
			throw new Error("No key returned from API");
		}
		return { key: json.key };
	});

export const deleteApiKeyFn = createServerFn({ method: "POST" })
	.inputValidator((keyId: string) => keyId)
	.handler(async ({ data: keyId }) => {
		const res = await postApi("/api/auth/api-key/delete", { keyId });
		const json = (await res.json()) as { success?: boolean };
		return { ok: json.success ?? true };
	});

export const listApiKeysQueryOptions = () =>
	queryOptions({
		queryKey: ["api-keys"],
		queryFn: () => listApiKeysFn()
	});

// ─── Billing ─────────────────────────────────────────────────────────────────

export const listSubscriptionsFn = createServerFn({ method: "GET" })
	.inputValidator((q: { limit?: number; page?: number }) => q)
	.handler(async ({ data }) => {
		const params = new URLSearchParams();
		if (data?.limit != null) params.set("limit", String(data.limit));
		if (data?.page != null) params.set("page", String(data.page));
		const res = await getApi(
			`/api/auth/dodopayments/customer/subscriptions/list?${params}`
		);
		if (!res.ok) return null;
		const json = await res.json();
		return json as { items: DodoSubscription[]; total: number };
	});

export const listPaymentsFn = createServerFn({ method: "GET" })
	.inputValidator((q: { limit?: number; page?: number }) => q)
	.handler(async ({ data }) => {
		const params = new URLSearchParams();
		if (data?.limit != null) params.set("limit", String(data.limit));
		if (data?.page != null) params.set("page", String(data.page));
		const res = await getApi(
			`/api/auth/dodopayments/customer/payments/list?${params}`
		);
		if (!res.ok) return null;
		const json = await res.json();
		return json as { items: DodoPayment[]; total: number };
	});

export const subscriptionsQueryOptions = (limit = 10, page = 1) =>
	queryOptions({
		queryKey: ["billing", "subscriptions", limit, page],
		queryFn: () => listSubscriptionsFn({ data: { limit, page } })
	});

export const paymentsQueryOptions = (limit = 5, page = 1) =>
	queryOptions({
		queryKey: ["billing", "payments", limit, page],
		queryFn: () => listPaymentsFn({ data: { limit, page } })
	});
