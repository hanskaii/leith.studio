import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { hc } from "hono/client";
import type { AppType } from "@workspace/api";
import { createApiClient } from "@/routes/-fn/api-client";
import { handleError } from "@/routes/-fn/handle-error";
import type { InferResponseType } from "hono/client";

const client = hc<AppType>("");

type PostsResponse = InferResponseType<typeof client.api.v1.posts.$get, 200>;
type PostResponse = InferResponseType<
	(typeof client.api.v1.posts)[":slug"]["$get"],
	200
>;
type StatsResponse = InferResponseType<
	typeof client.api.v1.posts.stats.$get,
	200
>;

export type PostsData = PostsResponse["data"];
export type PostData = PostResponse["data"];
export type StatsData = StatsResponse["data"];

export const getPostsFn = createServerFn({ method: "GET" })
	.inputValidator((input: { page?: number; tag?: string }) => input)
	.handler(({ data }) =>
		handleError(async () => {
			const api = createApiClient();
			const res = await api.api.v1.posts.$get({
				query: {
					page: String(data.page ?? 1),
					...(data.tag ? { tag: data.tag } : {})
				}
			});
			const json = (await res.json()) as PostsResponse;
			return json.data;
		})
	);

export const getPostFn = createServerFn({ method: "GET" })
	.inputValidator((slug: string) => slug)
	.handler(({ data: slug }) =>
		handleError(async () => {
			const api = createApiClient();
			const res = await api.api.v1.posts[":slug"].$get({
				param: { slug }
			});
			const json = (await res.json()) as PostResponse;
			return json.data;
		})
	);

export const getPostStatsFn = createServerFn({ method: "GET" }).handler(() =>
	handleError(async () => {
		const api = createApiClient();
		const res = await api.api.v1.posts.stats.$get();
		const json = (await res.json()) as StatsResponse;
		return json.data;
	})
);

export const postsQueryOptions = (page = 1, tag?: string) =>
	queryOptions({
		queryKey: ["posts", page, tag],
		queryFn: () => getPostsFn({ data: { page, tag } })
	});

export const postQueryOptions = (slug: string) =>
	queryOptions({
		queryKey: ["post", slug],
		queryFn: () => getPostFn({ data: slug })
	});

export const postStatsQueryOptions = () =>
	queryOptions({
		queryKey: ["post-stats"],
		queryFn: () => getPostStatsFn()
	});
