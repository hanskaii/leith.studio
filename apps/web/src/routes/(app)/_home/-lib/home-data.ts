export const ACCESS_URL = "/activate";

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
