import { createServerFn } from "@tanstack/react-start";
import { hc } from "hono/client";
import type { AppType } from "@workspace/api";
import { createApiClient } from "@/routes/-fn/api-client";
import { handleError } from "@/routes/-fn/handle-error";
import type { InferResponseType } from "hono/client";

const client = hc<AppType>("");

type ActivateResponse = InferResponseType<
	typeof client.api.v1.license.activate.$post,
	200
>;

export const activateLicenseFn = createServerFn({ method: "POST" })
	.inputValidator((input: { data: string }) => input)
	.handler(({ data: { data: key } }) =>
		handleError(async () => {
			const api = createApiClient();
			const res = await api.api.v1.license.activate.$post({
				json: { key }
			});
			const json = (await res.json()) as ActivateResponse;
			return json.data;
		})
	);
