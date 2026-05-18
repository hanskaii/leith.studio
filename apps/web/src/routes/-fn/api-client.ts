import { hc } from "hono/client";
import { env } from "cloudflare:workers";
import { getRequest } from "@tanstack/react-start/server";
import type { AppType } from "@workspace/api";

export function createApiClient() {
	const request = getRequest();

	return hc<AppType>("https://internal", {
		fetch: (input: RequestInfo | URL, init?: RequestInit) => {
			const headers = new Headers(init?.headers);

			// Forward auth cookies from the incoming SSR request
			if (request) {
				const cookie = request.headers.get("cookie");
				if (cookie) headers.set("cookie", cookie);

				const origin = request.headers.get("origin");
				if (origin) headers.set("origin", origin);

				const referer = request.headers.get("referer");
				if (referer) headers.set("referer", referer);
			}

			return env.API_SERVICE.fetch(input as RequestInfo, {
				...init,
				headers
			});
		}
	});
}

export async function fetchApi(
	path: string,
	options: RequestInit = {}
): Promise<Response> {
	return env.API_SERVICE.fetch(`https://internal${path}`, options);
}

export async function fetchApiWithAuth(
	path: string,
	options: RequestInit = {}
): Promise<Response> {
	const request = getRequest();
	const headers = new Headers(options.headers);

	if (request) {
		const cookie = request.headers.get("cookie");
		if (cookie) headers.set("cookie", cookie);

		const origin = request.headers.get("origin");
		if (origin) headers.set("origin", origin);

		const referer = request.headers.get("referer");
		if (referer) headers.set("referer", referer);
	}

	return fetchApi(path, { ...options, headers });
}

export async function getApi(
	path: string,
	options: RequestInit = {}
): Promise<Response> {
	return fetchApiWithAuth(path, { method: "GET", ...options });
}

export async function postApi<T = unknown>(
	path: string,
	body: T,
	options: RequestInit = {}
): Promise<Response> {
	const isFormData = body instanceof FormData;
	return fetchApiWithAuth(path, {
		method: "POST",
		...options,
		headers: {
			...(isFormData ? {} : { "content-type": "application/json" }),
			...options.headers
		},
		body: isFormData ? (body as any) : JSON.stringify(body)
	});
}
