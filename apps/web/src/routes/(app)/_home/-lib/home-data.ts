import type { FeedAsset } from "../feed/-lib/feed-data";

export const ACCESS_URL = "/activate";

export const ASSETS: FeedAsset[] = [
	{
		id: "1",
		slug: "void-ambience",
		title: "Void Layer",
		tag: "Loop",
		type: "video",
		access: "free",
		format: "MP4",
		resolution: "1080p",
		coverThumb: "https://picsum.photos/seed/dark01/640/400",
		popularity: 0,
		publishedAt: ""
	},
	{
		id: "2",
		slug: "ember-drift",
		title: "Ember Drift",
		tag: "Background",
		type: "video",
		access: "free",
		format: "MP4",
		resolution: "1080p",
		coverThumb: "https://picsum.photos/seed/dark02/640/400",
		popularity: 0,
		publishedAt: ""
	},
	{
		id: "3",
		slug: "smoke-curtain",
		title: "Ash Cascade",
		tag: "Overlay",
		type: "video",
		access: "members",
		format: "WEBM",
		resolution: "1080p",
		coverThumb: "https://picsum.photos/seed/dark03/640/400",
		popularity: 0,
		publishedAt: ""
	},
	{
		id: "4",
		slug: "storm-transition",
		title: "Depth Pull",
		tag: "Transition",
		type: "video",
		access: "free",
		format: "MP4",
		resolution: "1080p",
		coverThumb: "https://picsum.photos/seed/dark04/640/400",
		popularity: 0,
		publishedAt: ""
	},
	{
		id: "5",
		slug: "blood-moon-loop",
		title: "Smoke Altar",
		tag: "Loop",
		type: "video",
		access: "members",
		format: "MP4",
		resolution: "1080p",
		coverThumb: "https://picsum.photos/seed/dark05/640/400",
		popularity: 0,
		publishedAt: ""
	},
	{
		id: "6",
		slug: "dark-forest",
		title: "Coal Rising",
		tag: "Background",
		type: "image",
		access: "members",
		format: "WEBM",
		resolution: "1080p",
		coverThumb: "https://picsum.photos/seed/dark06/640/400",
		popularity: 0,
		publishedAt: ""
	},
	{
		id: "7",
		slug: "shattered-glass",
		title: "Mirror Dark",
		tag: "Overlay",
		type: "video",
		access: "members",
		format: "MP4",
		resolution: "1080p",
		coverThumb: "https://picsum.photos/seed/dark07/640/400",
		popularity: 0,
		publishedAt: ""
	},
	{
		id: "8",
		slug: "noir-rain-loop",
		title: "Flare Terminal",
		tag: "Loop",
		type: "video",
		access: "free",
		format: "MP4",
		resolution: "1080p",
		coverThumb: "https://picsum.photos/seed/dark08/640/400",
		popularity: 0,
		publishedAt: ""
	}
];

export const FAQ_ITEMS = [
	{
		q: "What's included in All Access?",
		a: "Every asset in the current library: video loops, backgrounds, overlays, and transitions, plus every future release. One purchase covers it all."
	},
	{
		q: "How do I receive my files?",
		a: "After purchase, you receive a license key. Activate it on Leith and download any asset directly. No subscriptions, no expiry."
	},
	{
		q: "Can I use Leith assets for client work?",
		a: "Yes. The license covers commercial use, including work you produce for clients and brand partnerships."
	},
	{
		q: "What formats and resolutions are included?",
		a: "MP4 and WEBM for video assets. All packs ship at 1920x1080 minimum; select packs include 4K variants."
	},
	{
		q: "Is there a refund policy?",
		a: "Digital goods aren't refundable once downloaded. Preview every asset before you buy."
	}
] as const;

export const STEPS = [
	{
		n: "1",
		title: "Browse the library",
		body: "Preview every asset before committing. Free assets are always open. Premium packs require All Access."
	},
	{
		n: "2",
		title: "Activate your license",
		body: "One purchase, one key. Enter it on Leith and unlock everything immediately. No waiting, no approvals."
	},
	{
		n: "3",
		title: "Download and use",
		body: "Direct file download. No DRM, no streaming dependency. Files are yours permanently."
	}
] as const;
