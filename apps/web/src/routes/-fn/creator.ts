import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { hc } from "hono/client";
import type { AppType } from "@workspace/api";
import { createApiClient } from "@/routes/-fn/api-client";
import { handleError } from "@/routes/-fn/handle-error";
import type { InferResponseType, InferRequestType } from "hono/client";

const client = hc<AppType>("");

type CreatorPostsResponse = InferResponseType<
	typeof client.api.v1.creator.posts.$get,
	200
>;
type CreatePostResponse = InferResponseType<
	typeof client.api.v1.creator.posts.$post,
	201
>;
type UpdatePostResponse = InferResponseType<
	(typeof client.api.v1.creator.posts)[":id"]["$patch"],
	200
>;
type PostStatusResponse = InferResponseType<
	(typeof client.api.v1.creator.posts)[":id"]["status"]["$get"],
	200
>;

export type PostStatusData = NonNullable<PostStatusResponse["data"]>;

type CreatePostInput = InferRequestType<
	typeof client.api.v1.creator.posts.$post
>["json"];
type UpdatePostInput = InferRequestType<
	(typeof client.api.v1.creator.posts)[":id"]["$patch"]
>["json"];

export type CreatorPostsData = NonNullable<CreatorPostsResponse["data"]>;
export type CreatorPost = CreatorPostsData[number];

export const getCreatorPostsFn = createServerFn({ method: "GET" }).handler(() =>
	handleError(async () => {
		const api = createApiClient();
		const res = await api.api.v1.creator.posts.$get();
		const json = (await res.json()) as CreatorPostsResponse;
		return json.data ?? [];
	})
);

export const createPostFn = createServerFn({ method: "POST" })
	.inputValidator((input: { data: CreatePostInput }) => input)
	.handler(({ data: { data } }) =>
		handleError(async () => {
			const api = createApiClient();
			const res = await api.api.v1.creator.posts.$post({ json: data });
			const json = (await res.json()) as CreatePostResponse;
			return json.data;
		})
	);

export const updatePostFn = createServerFn({ method: "POST" })
	.inputValidator(
		(input: { data: { id: string; data: UpdatePostInput } }) => input
	)
	.handler(
		({
			data: {
				data: { id, data }
			}
		}) =>
			handleError(async () => {
				const api = createApiClient();
				const res = await api.api.v1.creator.posts[":id"].$patch({
					param: { id },
					json: data
				});
				const json = (await res.json()) as UpdatePostResponse;
				return json.data;
			})
	);

export const deletePostFn = createServerFn({ method: "POST" })
	.inputValidator((input: { data: string }) => input)
	.handler(({ data: { data: id } }) =>
		handleError(async () => {
			const api = createApiClient();
			await api.api.v1.creator.posts[":id"].$delete({ param: { id } });
		})
	);

export const uploadImageFn = createServerFn({ method: "POST" })
	.inputValidator((data: FormData) => data)
	.handler(({ data }) =>
		handleError(async () => {
			const api = createApiClient();
			const res = await (api.api.v1.creator as any)["upload-cover"].$post(
				{
					form: data
				}
			);
			const json = await res.json();
			return (json as any).data as { url: string; thumbUrl: string };
		})
	);

export const uploadStudioFn = createServerFn({ method: "POST" })
	.inputValidator((data: FormData) => data)
	.handler(({ data }) =>
		handleError(async () => {
			const api = createApiClient();
			const res = await api.api.v1.creator.upload.$post({
				form: data
			} as any);
			const json = await res.json();
			return (json as any).data as {
				postId: string;
				post: {
					id: string;
					slug: string;
					title: string;
					body: string;
					status: "draft" | "published";
					mediaStatus: "pending" | "ready" | "failed";
					enrichmentStatus:
						| "pending"
						| "processing"
						| "done"
						| "failed";
					access: "free" | "premium";
					createdAt: string;
				};
			};
		})
	);

export const uploadAssetFn = createServerFn({ method: "POST" })
	.inputValidator((data: FormData) => data)
	.handler(({ data }) =>
		handleError(async () => {
			const api = createApiClient();
			const res = await (api.api.v1.creator as any)["upload-asset"].$post(
				{
					form: data
				}
			);
			const json = await res.json();
			return (json as any).data as { url: string; key: string };
		})
	);

export const getPostStatusFn = createServerFn({ method: "GET" })
	.inputValidator((input: { data: string }) => input)
	.handler(({ data: { data: id } }) =>
		handleError(async () => {
			const api = createApiClient();
			const res = await api.api.v1.creator.posts[":id"].status.$get({
				param: { id }
			});
			const json = (await res.json()) as PostStatusResponse;
			return json.data;
		})
	);

export const creatorPostsQueryOptions = () =>
	queryOptions({
		queryKey: ["creator-posts"],
		queryFn: () => getCreatorPostsFn()
	});

export const postStatusQueryOptions = (id: string, enabled: boolean) =>
	queryOptions({
		queryKey: ["post-status", id],
		queryFn: () => getPostStatusFn({ data: { data: id } }),
		enabled,
		refetchInterval: (query) => {
			const status = query.state.data?.mediaStatus;
			if (status === "pending") return 3000;
			return false;
		}
	});
