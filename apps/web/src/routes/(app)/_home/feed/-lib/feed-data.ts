export type TagRef = {
	slug: string;
	name: string;
};

export type FeedAsset = {
	id: string;
	slug: string;
	title: string;
	tags: TagRef[];
	type: "video" | "audio" | "image";
	access: "free" | "members";
	format: string;
	resolution: string;
	coverUrl: string;
	thumbUrl: string;
	popularity: number;
	publishedAt: string;
};

export const PAGE_SIZE = 9;
