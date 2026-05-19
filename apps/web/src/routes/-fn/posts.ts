import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { createApiClient, fetchApiWithAuth } from "@/routes/-fn/api-client";
import { handleError } from "@/routes/-fn/handle-error";

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
			const { data: results } = await res.json();

			return results;
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
			const { data: results } = await res.json();

			return results;
		})
	);

export const getPostStatsFn = createServerFn({ method: "GET" }).handler(() =>
	handleError(async () => {
		const api = createApiClient();

		const res = await api.api.v1.posts.stats.$get();

		const { data: results } = await res.json();

		return results;
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

export const downloadAssetFn = createServerFn({ method: "GET" })
	.inputValidator((input: { data: string }) => input)
	.handler(({ data: { data: slug } }) =>
		fetchApiWithAuth(`/api/v1/posts/${slug}/download`)
	);
