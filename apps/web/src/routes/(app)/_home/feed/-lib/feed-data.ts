export type FeedAsset = {
	id: string;
	slug: string;
	title: string;
	tag: string;
	type: "video" | "image";
	access: "free" | "members";
	format: string;
	resolution: string;
	coverThumb: string;
	previewUrl?: string;
	clipUrl?: string;
	popularity: number;
	publishedAt: string;
};

const img = (id: string) =>
	`https://images.unsplash.com/photo-${id}?w=800&q=75&auto=format&fit=crop`;

export const FEED_ASSETS: FeedAsset[] = [
	{
		id: "1",
		slug: "noir-rain-loop",
		title: "Noir Rain Loop",
		tag: "Loop",
		type: "video",
		access: "free",
		format: "mp4",
		resolution: "4K",
		coverThumb: img("1518640467707-6811f4a6ab73"),
		popularity: 98,
		publishedAt: "2024-03-10"
	},
	{
		id: "2",
		slug: "obsidian-fog",
		title: "Obsidian Fog",
		tag: "Ambience",
		type: "video",
		access: "members",
		format: "mp4",
		resolution: "4K",
		coverThumb: img("1419833479478-11ca64c1e585"),
		popularity: 87,
		publishedAt: "2024-03-08"
	},
	{
		id: "3",
		slug: "ember-drift",
		title: "Ember Drift",
		tag: "Loop",
		type: "video",
		access: "members",
		format: "mp4",
		resolution: "1080p",
		coverThumb: img("1516912481808-3406841bd33c"),
		popularity: 76,
		publishedAt: "2024-03-05"
	},
	{
		id: "4",
		slug: "shattered-glass",
		title: "Shattered Glass",
		tag: "Overlay",
		type: "video",
		access: "members",
		format: "webm",
		resolution: "4K",
		coverThumb: img("1558618666-fcd25c85cd64"),
		popularity: 65,
		publishedAt: "2024-02-28"
	},
	{
		id: "5",
		slug: "deep-space",
		title: "Deep Space",
		tag: "Background",
		type: "image",
		access: "free",
		format: "jpg",
		resolution: "4K",
		coverThumb: img("1480714378408-67cf0d13bc1b"),
		popularity: 92,
		publishedAt: "2024-02-25"
	},
	{
		id: "6",
		slug: "neon-city-night",
		title: "Neon City Night",
		tag: "Background",
		type: "image",
		access: "free",
		format: "jpg",
		resolution: "4K",
		coverThumb: img("1525909002-1b05e0c869dd"),
		popularity: 84,
		publishedAt: "2024-02-20"
	},
	{
		id: "7",
		slug: "storm-transition",
		title: "Storm Transition",
		tag: "Transition",
		type: "video",
		access: "members",
		format: "mp4",
		resolution: "1080p",
		coverThumb: img("1476514525405-09baa58e8721"),
		popularity: 71,
		publishedAt: "2024-02-15"
	},
	{
		id: "8",
		slug: "blood-moon-loop",
		title: "Blood Moon Loop",
		tag: "Loop",
		type: "video",
		access: "members",
		format: "mp4",
		resolution: "4K",
		coverThumb: img("1491029113948-a1f3e42e7f15"),
		popularity: 89,
		publishedAt: "2024-02-10"
	},
	{
		id: "9",
		slug: "dark-forest",
		title: "Dark Forest",
		tag: "Background",
		type: "image",
		access: "members",
		format: "jpg",
		resolution: "2K",
		coverThumb: img("1441974231531-c6227db76b6e"),
		popularity: 58,
		publishedAt: "2024-02-05"
	},
	{
		id: "10",
		slug: "smoke-curtain",
		title: "Smoke Curtain",
		tag: "Overlay",
		type: "video",
		access: "free",
		format: "webm",
		resolution: "1080p",
		coverThumb: img("1451187580459-43490279c0fa"),
		popularity: 73,
		publishedAt: "2024-01-28"
	},
	{
		id: "11",
		slug: "void-ambience",
		title: "Void Ambience",
		tag: "Ambience",
		type: "video",
		access: "members",
		format: "mp4",
		resolution: "4K",
		coverThumb: img("1470252649021-ba82e40a5792"),
		popularity: 62,
		publishedAt: "2024-01-20"
	},
	{
		id: "12",
		slug: "glitch-wipe",
		title: "Glitch Wipe",
		tag: "Transition",
		type: "video",
		access: "members",
		format: "mp4",
		resolution: "1080p",
		coverThumb: img("1464822759023-fed622ff2c3b"),
		popularity: 55,
		publishedAt: "2024-01-15"
	}
];

export const FEED_TAGS = [...new Set(FEED_ASSETS.map((a) => a.tag))];
export const PAGE_SIZE = 9;
