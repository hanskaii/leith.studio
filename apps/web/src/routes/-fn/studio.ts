import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { hc } from "hono/client";
import type { AppType } from "@workspace/api";
import { createApiClient } from "@/routes/-fn/api-client";
import { handleError } from "@/routes/-fn/handle-error";
import type { InferResponseType, InferRequestType } from "hono/client";

const client = hc<AppType>("");

// ── Inferred types ────────────────────────────────────────────────────────────

type ReviewResponse = InferResponseType<
	(typeof client.api.v1.studio.review)["$get"],
	200
>;
type ApproveInput = InferRequestType<
	(typeof client.api.v1.studio.review)["approve"]["$post"]
>["json"];
type RejectInput = InferRequestType<
	(typeof client.api.v1.studio.review)["reject"]["$post"]
>["json"];

export type StudioGeneration = NonNullable<ReviewResponse["data"]>[number];

// ── Review ────────────────────────────────────────────────────────────────────

export const getReviewFn = createServerFn({ method: "GET" }).handler(() =>
	handleError(async () => {
		const api = createApiClient();
		const res = await api.api.v1.studio.review.$get();
		const json = (await res.json()) as ReviewResponse;
		return json.data ?? [];
	})
);

export const approveGenerationsFn = createServerFn({ method: "POST" })
	.inputValidator((input: ApproveInput) => input)
	.handler(({ data }) =>
		handleError(async () => {
			const api = createApiClient();
			const res = await api.api.v1.studio.review.approve.$post({
				json: data
			});
			const json = (await res.json()) as any;
			return json.data;
		})
	);

export const rejectGenerationsFn = createServerFn({ method: "POST" })
	.inputValidator((input: RejectInput) => input)
	.handler(({ data }) =>
		handleError(async () => {
			const api = createApiClient();
			await api.api.v1.studio.review.reject.$post({ json: data });
		})
	);

// ── Query options ─────────────────────────────────────────────────────────────

export const studioReviewQueryOptions = () =>
	queryOptions({
		queryKey: ["studio-review"],
		queryFn: () => getReviewFn()
	});
