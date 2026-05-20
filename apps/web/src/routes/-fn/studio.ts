import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { hc } from "hono/client";
import type { AppType } from "@workspace/api";
import { createApiClient } from "@/routes/-fn/api-client";
import { handleError } from "@/routes/-fn/handle-error";
import type { InferResponseType, InferRequestType } from "hono/client";

const client = hc<AppType>("");

// ── Inferred types ────────────────────────────────────────────────────────────

type TopicsResponse = InferResponseType<
	(typeof client.api.v1.studio.topics)["$get"],
	200
>;
type CreateTopicResponse = InferResponseType<
	(typeof client.api.v1.studio.topics)["$post"],
	201
>;
type ReviewResponse = InferResponseType<
	(typeof client.api.v1.studio.review)["$get"],
	200
>;
type SettingsResponse = InferResponseType<
	(typeof client.api.v1.studio.settings)["$get"],
	200
>;

type CreateTopicInput = InferRequestType<
	(typeof client.api.v1.studio.topics)["$post"]
>["json"];
type UpdateTopicInput = InferRequestType<
	(typeof client.api.v1.studio.topics)[":id"]["$patch"]
>["json"];
type UpdateTopicResponse = InferResponseType<
	(typeof client.api.v1.studio.topics)[":id"]["$patch"],
	200
>;
type UpdateSettingsInput = InferRequestType<
	(typeof client.api.v1.studio.settings)["$put"]
>["json"];
type UpdateSettingsResponse = InferResponseType<
	(typeof client.api.v1.studio.settings)["$put"],
	200
>;
type ApproveInput = InferRequestType<
	(typeof client.api.v1.studio.review)["approve"]["$post"]
>["json"];
type RejectInput = InferRequestType<
	(typeof client.api.v1.studio.review)["reject"]["$post"]
>["json"];
type ApproveResponse = InferResponseType<
	(typeof client.api.v1.studio.review)["approve"]["$post"],
	200
>;

export type StudioTopic = NonNullable<TopicsResponse["data"]>[number];
export type StudioGeneration = NonNullable<ReviewResponse["data"]>[number];
export type StudioSettings = NonNullable<SettingsResponse["data"]>;

// ── Topics ────────────────────────────────────────────────────────────────────

export const getTopicsFn = createServerFn({ method: "GET" }).handler(() =>
	handleError(async () => {
		const api = createApiClient();
		const res = await api.api.v1.studio.topics.$get();
		const json = (await res.json()) as TopicsResponse;
		return json.data ?? [];
	})
);

export const createTopicFn = createServerFn({ method: "POST" })
	.inputValidator((input: { data: CreateTopicInput }) => input)
	.handler(({ data: { data } }) =>
		handleError(async () => {
			const api = createApiClient();
			const res = await api.api.v1.studio.topics.$post({ json: data });
			const json = (await res.json()) as CreateTopicResponse;
			return json.data;
		})
	);

export const updateTopicFn = createServerFn({ method: "POST" })
	.inputValidator(
		(input: { data: { id: string; data: UpdateTopicInput } }) => input
	)
	.handler(
		({
			data: {
				data: { id, data }
			}
		}) =>
			handleError(async () => {
				const api = createApiClient();
				const res = await api.api.v1.studio.topics[":id"].$patch({
					param: { id },
					json: data
				});
				const json = (await res.json()) as UpdateTopicResponse;
				return json.data;
			})
	);

export const deleteTopicFn = createServerFn({ method: "POST" })
	.inputValidator((input: { data: string }) => input)
	.handler(({ data: { data: id } }) =>
		handleError(async () => {
			const api = createApiClient();
			await api.api.v1.studio.topics[":id"].$delete({ param: { id } });
		})
	);

export const triggerTopicFn = createServerFn({ method: "POST" })
	.inputValidator((input: { data: string }) => input)
	.handler(({ data: { data: id } }) =>
		handleError(async () => {
			const api = createApiClient();
			await api.api.v1.studio.topics[":id"].trigger.$post({
				param: { id }
			});
		})
	);

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
	.inputValidator((input: { data: ApproveInput }) => input)
	.handler(({ data: { data } }) =>
		handleError(async () => {
			const api = createApiClient();
			const res = await api.api.v1.studio.review.approve.$post({
				json: data
			});
			const json = (await res.json()) as ApproveResponse;
			return json.data;
		})
	);

export const rejectGenerationsFn = createServerFn({ method: "POST" })
	.inputValidator((input: { data: RejectInput }) => input)
	.handler(({ data: { data } }) =>
		handleError(async () => {
			const api = createApiClient();
			await api.api.v1.studio.review.reject.$post({ json: data });
		})
	);

// ── Settings ──────────────────────────────────────────────────────────────────

export const getSettingsFn = createServerFn({ method: "GET" }).handler(() =>
	handleError(async () => {
		const api = createApiClient();
		const res = await api.api.v1.studio.settings.$get();
		const json = (await res.json()) as SettingsResponse;
		return json.data ?? null;
	})
);

export const updateSettingsFn = createServerFn({ method: "POST" })
	.inputValidator((input: { data: UpdateSettingsInput }) => input)
	.handler(({ data: { data } }) =>
		handleError(async () => {
			const api = createApiClient();
			const res = await api.api.v1.studio.settings.$put({ json: data });
			const json = (await res.json()) as UpdateSettingsResponse;
			return json.data;
		})
	);

// ── Query options ─────────────────────────────────────────────────────────────

export const studioTopicsQueryOptions = () =>
	queryOptions({
		queryKey: ["studio-topics"],
		queryFn: () => getTopicsFn()
	});

export const studioReviewQueryOptions = () =>
	queryOptions({
		queryKey: ["studio-review"],
		queryFn: () => getReviewFn()
	});

export const studioSettingsQueryOptions = () =>
	queryOptions({
		queryKey: ["studio-settings"],
		queryFn: () => getSettingsFn()
	});
