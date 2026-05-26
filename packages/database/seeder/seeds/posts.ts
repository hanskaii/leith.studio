import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../../schema";
import { slugifyTag } from "../../utils/slug";

const img = (id: string) =>
	`https://images.unsplash.com/photo-${id}?w=1600&q=80&auto=format&fit=crop`;

const thumb = (id: string) =>
	`https://images.unsplash.com/photo-${id}?w=800&q=75&auto=format&fit=crop`;

const doc = (text: string) =>
	JSON.stringify({
		type: "doc",
		content: [
			{
				type: "paragraph",
				content: [{ type: "text", text }]
			}
		]
	});

const MB = 1024 * 1024;

const SEED_AUTHOR_ID = "user_seed_admin";

type SeedPostRow = {
	id: string;
	slug: string;
	title: string;
	body: string;
	coverPhoto: string;
	access: "free" | "premium";
	publishedDaysAgo: number;
};

type SeedMetaRow = {
	postId: string;
	format: "mp4" | "webm" | "jpg" | "png";
	resolution: string;
	duration: number | null;
	isLoop: boolean;
	fileKey: string;
	fileSize: number;
};

export async function seedPosts(db: DrizzleD1Database<typeof schema> | any) {
	console.log("🎬 Seeding posts, tags, and asset metadata...");

	const now = new Date();
	const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

	const seedAuthor = await db.query.users.findFirst({});
	const authorId: string = seedAuthor?.id ?? SEED_AUTHOR_ID;

	const postsData: SeedPostRow[] = [
		{
			id: "post_noir_rain",
			slug: "noir-rain-loop",
			title: "Noir Rain Loop",
			body: doc(
				"A seamless dark rain loop with film-grain overlay. Works across any dark scene — moody, cinematic, and endlessly loopable."
			),
			coverPhoto: "1518640467707-6811f4a6ab73",
			access: "free",
			publishedDaysAgo: 30
		},
		{
			id: "post_obsidian_fog",
			slug: "obsidian-fog",
			title: "Obsidian Fog",
			body: doc(
				"Dense volumetric fog rolling across a dark obsidian surface. Ideal as a looping stream background or overlay element."
			),
			coverPhoto: "1419833479478-11ca64c1e585",
			access: "premium",
			publishedDaysAgo: 28
		},
		{
			id: "post_ember_drift",
			slug: "ember-drift",
			title: "Ember Drift",
			body: doc(
				"Slow-drifting embers rising through darkness. Pairs well with fire-themed streams, atmospheric gaming sessions, or lo-fi backgrounds."
			),
			coverPhoto: "1516912481808-3406841bd33c",
			access: "premium",
			publishedDaysAgo: 25
		},
		{
			id: "post_shattered_glass",
			slug: "shattered-glass",
			title: "Shattered Glass",
			body: doc(
				"A high-speed glass shatter captured in extreme slow motion. Use as a transition hit or overlay effect on a dark scene."
			),
			coverPhoto: "1558618666-fcd25c85cd64",
			access: "premium",
			publishedDaysAgo: 22
		},
		{
			id: "post_deep_space",
			slug: "deep-space",
			title: "Deep Space",
			body: doc(
				"A deep-field nebula still at 4K. Rich dark blues and purples with subtle star clusters. Works as a static stream background or panel art."
			),
			coverPhoto: "1480714378408-67cf0d13bc1b",
			access: "free",
			publishedDaysAgo: 20
		},
		{
			id: "post_neon_city",
			slug: "neon-city-night",
			title: "Neon City Night",
			body: doc(
				"Urban night photography shot from above. Neon reflections on wet streets, high contrast, cinematic colour grading."
			),
			coverPhoto: "1525909002-1b05e0c869dd",
			access: "free",
			publishedDaysAgo: 18
		},
		{
			id: "post_storm_transition",
			slug: "storm-transition",
			title: "Storm Transition",
			body: doc(
				"A dramatic storm wipe from black. Three-second clip designed as a hard scene transition — cuts cleanly at both ends."
			),
			coverPhoto: "1476514525405-09baa58e8721",
			access: "premium",
			publishedDaysAgo: 15
		},
		{
			id: "post_blood_moon",
			slug: "blood-moon-loop",
			title: "Blood Moon Loop",
			body: doc(
				"A slow-rotating blood moon against a deep black sky. Subtle atmospheric haze gives it depth. Seamless 45-second loop."
			),
			coverPhoto: "1491029113948-a1f3e42e7f15",
			access: "premium",
			publishedDaysAgo: 12
		},
		{
			id: "post_dark_forest",
			slug: "dark-forest",
			title: "Dark Forest",
			body: doc(
				"Dense forest canopy at night — mist between trees, faint moonlight filtering through. 2K still image, portrait and landscape crops included."
			),
			coverPhoto: "1441974231531-c6227db76b6e",
			access: "premium",
			publishedDaysAgo: 10
		},
		{
			id: "post_smoke_curtain",
			slug: "smoke-curtain",
			title: "Smoke Curtain",
			body: doc(
				"Billowing smoke forming a curtain across frame. Layer over any background for atmosphere. 1080p WebM with alpha channel."
			),
			coverPhoto: "1451187580459-43490279c0fa",
			access: "free",
			publishedDaysAgo: 8
		},
		{
			id: "post_void_ambience",
			slug: "void-ambience",
			title: "Void Ambience",
			body: doc(
				"Near-silent visual ambience — subtle particle drift in absolute darkness. Two-minute loop designed for extended stream use without visual fatigue."
			),
			coverPhoto: "1470252649021-ba82e40a5792",
			access: "premium",
			publishedDaysAgo: 5
		},
		{
			id: "post_glitch_wipe",
			slug: "glitch-wipe",
			title: "Glitch Wipe",
			body: doc(
				"A two-second digital glitch wipe for hard cuts and scene breaks. RGB split, scan lines, and block corruption in a single tight clip."
			),
			coverPhoto: "1464822759023-fed622ff2c3b",
			access: "premium",
			publishedDaysAgo: 2
		}
	];

	const postTagsMap: Record<string, string[]> = {
		post_noir_rain: ["Loop", "Rain", "Cinematic"],
		post_obsidian_fog: ["Ambience", "Fog", "Dark"],
		post_ember_drift: ["Loop", "Fire", "Ambient"],
		post_shattered_glass: ["Overlay", "Transition", "Impact"],
		post_deep_space: ["Background", "Space", "Static"],
		post_neon_city: ["Background", "Urban", "Neon"],
		post_storm_transition: ["Transition", "Storm", "Effect"],
		post_blood_moon: ["Loop", "Moon", "Cinematic"],
		post_dark_forest: ["Background", "Nature", "Dark"],
		post_smoke_curtain: ["Overlay", "Smoke", "Loop"],
		post_void_ambience: ["Ambience", "Minimal", "Dark"],
		post_glitch_wipe: ["Transition", "Glitch", "Effect"]
	};

	const metadataData: SeedMetaRow[] = [
		{
			postId: "post_noir_rain",
			format: "mp4",
			resolution: "4K",
			duration: 30,
			isLoop: true,
			fileKey: "assets/noir-rain-loop.mp4",
			fileSize: Math.round(180 * MB)
		},
		{
			postId: "post_obsidian_fog",
			format: "mp4",
			resolution: "4K",
			duration: 60,
			isLoop: true,
			fileKey: "assets/obsidian-fog.mp4",
			fileSize: Math.round(340 * MB)
		},
		{
			postId: "post_ember_drift",
			format: "mp4",
			resolution: "1080p",
			duration: 20,
			isLoop: true,
			fileKey: "assets/ember-drift.mp4",
			fileSize: Math.round(95 * MB)
		},
		{
			postId: "post_shattered_glass",
			format: "webm",
			resolution: "4K",
			duration: 5,
			isLoop: false,
			fileKey: "assets/shattered-glass.webm",
			fileSize: Math.round(210 * MB)
		},
		{
			postId: "post_deep_space",
			format: "jpg",
			resolution: "4K",
			duration: null,
			isLoop: false,
			fileKey: "assets/deep-space.jpg",
			fileSize: Math.round(18 * MB)
		},
		{
			postId: "post_neon_city",
			format: "jpg",
			resolution: "4K",
			duration: null,
			isLoop: false,
			fileKey: "assets/neon-city-night.jpg",
			fileSize: Math.round(22 * MB)
		},
		{
			postId: "post_storm_transition",
			format: "mp4",
			resolution: "1080p",
			duration: 3,
			isLoop: false,
			fileKey: "assets/storm-transition.mp4",
			fileSize: Math.round(45 * MB)
		},
		{
			postId: "post_blood_moon",
			format: "mp4",
			resolution: "4K",
			duration: 45,
			isLoop: true,
			fileKey: "assets/blood-moon-loop.mp4",
			fileSize: Math.round(260 * MB)
		},
		{
			postId: "post_dark_forest",
			format: "jpg",
			resolution: "2K",
			duration: null,
			isLoop: false,
			fileKey: "assets/dark-forest.jpg",
			fileSize: Math.round(12 * MB)
		},
		{
			postId: "post_smoke_curtain",
			format: "webm",
			resolution: "1080p",
			duration: 10,
			isLoop: true,
			fileKey: "assets/smoke-curtain.webm",
			fileSize: Math.round(75 * MB)
		},
		{
			postId: "post_void_ambience",
			format: "mp4",
			resolution: "4K",
			duration: 120,
			isLoop: true,
			fileKey: "assets/void-ambience.mp4",
			fileSize: Math.round(480 * MB)
		},
		{
			postId: "post_glitch_wipe",
			format: "mp4",
			resolution: "1080p",
			duration: 2,
			isLoop: false,
			fileKey: "assets/glitch-wipe.mp4",
			fileSize: Math.round(30 * MB)
		}
	];

	for (const post of postsData) {
		await db
			.insert(schema.posts)
			.values({
				id: post.id,
				authorId,
				slug: post.slug,
				title: post.title,
				body: post.body,
				status: "published" as const,
				mediaStatus: "ready" as const,
				access: post.access,
				publishedAt: daysAgo(post.publishedDaysAgo),
				createdAt: daysAgo(post.publishedDaysAgo + 2),
				updatedAt: daysAgo(post.publishedDaysAgo)
			})
			.onConflictDoNothing();
	}

	for (const meta of metadataData) {
		await db.insert(schema.postMetadata).values(meta).onConflictDoNothing();
	}

	// Seed post_assets — cover and thumb point at the externally-hosted
	// Unsplash URL (toUrl in the handler passes through full URLs as-is),
	// asset points at an R2-style key we'd resolve via /api/files/.
	const assetRows = postsData.flatMap((post) => {
		const photoId = post.coverPhoto;
		const meta = metadataData.find((m) => m.postId === post.id);
		const rows = [
			{
				id: crypto.randomUUID(),
				postId: post.id,
				role: "cover" as const,
				key: img(photoId),
				format: "jpg"
			},
			{
				id: crypto.randomUUID(),
				postId: post.id,
				role: "thumb" as const,
				key: thumb(photoId),
				format: "jpg"
			}
		];
		if (meta) {
			rows.push({
				id: crypto.randomUUID(),
				postId: post.id,
				role: "asset" as const,
				key: meta.fileKey,
				format: meta.format
			});
		}
		return rows;
	});

	for (const asset of assetRows) {
		await db.insert(schema.postAssets).values(asset).onConflictDoNothing();
	}

	// Build the unique tag set across all posts, keyed by slug so duplicates
	// from different casings collapse. Each tag gets a stable UUID we can
	// reference when inserting the junction rows.
	const tagBySlug = new Map<
		string,
		{ id: string; slug: string; name: string }
	>();
	for (const names of Object.values(postTagsMap)) {
		for (const name of names) {
			const slug = slugifyTag(name);
			if (!slug) continue;
			if (!tagBySlug.has(slug)) {
				tagBySlug.set(slug, {
					id: crypto.randomUUID(),
					slug,
					name
				});
			}
		}
	}

	for (const tag of tagBySlug.values()) {
		await db
			.insert(schema.tags)
			.values({
				id: tag.id,
				slug: tag.slug,
				name: tag.name,
				createdAt: now
			})
			.onConflictDoNothing();
	}

	for (const [postId, names] of Object.entries(postTagsMap)) {
		for (const name of names) {
			const slug = slugifyTag(name);
			if (!slug) continue;
			const tag = tagBySlug.get(slug);
			if (!tag) continue;
			await db
				.insert(schema.postTags)
				.values({ postId, tagId: tag.id })
				.onConflictDoNothing();
		}
	}

	console.log(
		`✓ Seeded ${postsData.length} posts, ${assetRows.length} assets, ${tagBySlug.size} tags`
	);

	return postsData;
}
