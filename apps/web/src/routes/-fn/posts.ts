import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { createApiClient, fetchApiWithAuth } from "@/routes/-fn/api-client";
import { handleError } from "@/routes/-fn/handle-error";
import type { FeedAsset } from "@/routes/(app)/_home/feed/-lib/feed-data";

export const getPostsFn = createServerFn({ method: "GET" })
	.inputValidator(
		(input: { page?: number; tag?: string; q?: string }) => input
	)
	.handler(({ data }) =>
		handleError(async () => {
			const api = createApiClient();
			const res = await api.api.v1.posts.$get({
				query: {
					page: String(data.page ?? 1),
					...(data.tag ? { tag: data.tag } : {}),
					...(data.q ? { q: data.q } : {})
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

export const postsQueryOptions = (page = 1, tag?: string, q?: string) =>
	queryOptions({
		queryKey: ["posts", page, tag, q],
		queryFn: () => getPostsFn({ data: { page, tag, q } })
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

const VIDEO_FORMATS = new Set(["mp4", "webm"]);
const AUDIO_FORMATS = new Set(["mp3", "wav", "ogg", "aac"]);

function assetType(format: string): "video" | "audio" | "image" {
	if (VIDEO_FORMATS.has(format)) return "video";
	if (AUDIO_FORMATS.has(format)) return "audio";
	return "image";
}

export function toFeedAsset(item: {
	id: string;
	slug: string;
	title: string;
	coverThumb: string | null;
	tags: { slug: string; name: string }[];
	format: string;
	resolution: string;
	access: string;
	isLoop: number;
	downloadCount: number;
	publishedAt: string | null;
	previewUrl?: string | null;
	clipUrl?: string | null;
}): FeedAsset {
	return {
		id: item.id,
		slug: item.slug,
		title: item.title,
		tags: item.tags ?? [],
		type: assetType(item.format),
		access: item.access === "free" ? "free" : "members",
		format: item.format,
		resolution: item.resolution,
		coverThumb: item.coverThumb ?? "",
		previewUrl: item.previewUrl ?? undefined,
		clipUrl: item.clipUrl ?? undefined,
		popularity: item.downloadCount,
		publishedAt: item.publishedAt ?? ""
	};
}

export const downloadAssetFn = createServerFn({ method: "GET" })
	.inputValidator((input: { data: string }) => input)
	.handler(({ data: { data: slug } }) =>
		fetchApiWithAuth(`/api/v1/posts/${slug}/download`)
	);
