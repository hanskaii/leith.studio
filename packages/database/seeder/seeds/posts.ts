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

export async function seedPosts(db: DrizzleD1Database<typeof schema> | any) {
	console.log("🎬 Seeding posts, tags, and asset metadata...");

	const now = new Date();
	const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

	// Tag map alongside posts — kept separately so we can normalize into the
	// `tags` + `post_tags` tables instead of stuffing a JSON array on `posts`.
	const postsData = [
		{
			id: "post_noir_rain",
			slug: "noir-rain-loop",
			title: "Noir Rain Loop",
			body: doc(
				"A seamless dark rain loop with film-grain overlay. Works across any dark scene — moody, cinematic, and endlessly loopable."
			),
			coverImage: img("1518640467707-6811f4a6ab73"),
			coverThumb: thumb("1518640467707-6811f4a6ab73"),
			status: "published" as const,
			publishedAt: daysAgo(30),
			createdAt: daysAgo(32),
			updatedAt: daysAgo(30)
		},
		{
			id: "post_obsidian_fog",
			slug: "obsidian-fog",
			title: "Obsidian Fog",
			body: doc(
				"Dense volumetric fog rolling across a dark obsidian surface. Ideal as a looping stream background or overlay element."
			),
			coverImage: img("1419833479478-11ca64c1e585"),
			coverThumb: thumb("1419833479478-11ca64c1e585"),
			status: "published" as const,
			publishedAt: daysAgo(28),
			createdAt: daysAgo(30),
			updatedAt: daysAgo(28)
		},
		{
			id: "post_ember_drift",
			slug: "ember-drift",
			title: "Ember Drift",
			body: doc(
				"Slow-drifting embers rising through darkness. Pairs well with fire-themed streams, atmospheric gaming sessions, or lo-fi backgrounds."
			),
			coverImage: img("1516912481808-3406841bd33c"),
			coverThumb: thumb("1516912481808-3406841bd33c"),
			status: "published" as const,
			publishedAt: daysAgo(25),
			createdAt: daysAgo(27),
			updatedAt: daysAgo(25)
		},
		{
			id: "post_shattered_glass",
			slug: "shattered-glass",
			title: "Shattered Glass",
			body: doc(
				"A high-speed glass shatter captured in extreme slow motion. Use as a transition hit or overlay effect on a dark scene."
			),
			coverImage: img("1558618666-fcd25c85cd64"),
			coverThumb: thumb("1558618666-fcd25c85cd64"),
			status: "published" as const,
			publishedAt: daysAgo(22),
			createdAt: daysAgo(24),
			updatedAt: daysAgo(22)
		},
		{
			id: "post_deep_space",
			slug: "deep-space",
			title: "Deep Space",
			body: doc(
				"A deep-field nebula still at 4K. Rich dark blues and purples with subtle star clusters. Works as a static stream background or panel art."
			),
			coverImage: img("1480714378408-67cf0d13bc1b"),
			coverThumb: thumb("1480714378408-67cf0d13bc1b"),
			status: "published" as const,
			publishedAt: daysAgo(20),
			createdAt: daysAgo(22),
			updatedAt: daysAgo(20)
		},
		{
			id: "post_neon_city",
			slug: "neon-city-night",
			title: "Neon City Night",
			body: doc(
				"Urban night photography shot from above. Neon reflections on wet streets, high contrast, cinematic colour grading."
			),
			coverImage: img("1525909002-1b05e0c869dd"),
			coverThumb: thumb("1525909002-1b05e0c869dd"),
			status: "published" as const,
			publishedAt: daysAgo(18),
			createdAt: daysAgo(20),
			updatedAt: daysAgo(18)
		},
		{
			id: "post_storm_transition",
			slug: "storm-transition",
			title: "Storm Transition",
			body: doc(
				"A dramatic storm wipe from black. Three-second clip designed as a hard scene transition — cuts cleanly at both ends."
			),
			coverImage: img("1476514525405-09baa58e8721"),
			coverThumb: thumb("1476514525405-09baa58e8721"),
			status: "published" as const,
			publishedAt: daysAgo(15),
			createdAt: daysAgo(17),
			updatedAt: daysAgo(15)
		},
		{
			id: "post_blood_moon",
			slug: "blood-moon-loop",
			title: "Blood Moon Loop",
			body: doc(
				"A slow-rotating blood moon against a deep black sky. Subtle atmospheric haze gives it depth. Seamless 45-second loop."
			),
			coverImage: img("1491029113948-a1f3e42e7f15"),
			coverThumb: thumb("1491029113948-a1f3e42e7f15"),
			status: "published" as const,
			publishedAt: daysAgo(12),
			createdAt: daysAgo(14),
			updatedAt: daysAgo(12)
		},
		{
			id: "post_dark_forest",
			slug: "dark-forest",
			title: "Dark Forest",
			body: doc(
				"Dense forest canopy at night — mist between trees, faint moonlight filtering through. 2K still image, portrait and landscape crops included."
			),
			coverImage: img("1441974231531-c6227db76b6e"),
			coverThumb: thumb("1441974231531-c6227db76b6e"),
			status: "published" as const,
			publishedAt: daysAgo(10),
			createdAt: daysAgo(12),
			updatedAt: daysAgo(10)
		},
		{
			id: "post_smoke_curtain",
			slug: "smoke-curtain",
			title: "Smoke Curtain",
			body: doc(
				"Billowing smoke forming a curtain across frame. Layer over any background for atmosphere. 1080p WebM with alpha channel."
			),
			coverImage: img("1451187580459-43490279c0fa"),
			coverThumb: thumb("1451187580459-43490279c0fa"),
			status: "published" as const,
			publishedAt: daysAgo(8),
			createdAt: daysAgo(10),
			updatedAt: daysAgo(8)
		},
		{
			id: "post_void_ambience",
			slug: "void-ambience",
			title: "Void Ambience",
			body: doc(
				"Near-silent visual ambience — subtle particle drift in absolute darkness. Two-minute loop designed for extended stream use without visual fatigue."
			),
			coverImage: img("1470252649021-ba82e40a5792"),
			coverThumb: thumb("1470252649021-ba82e40a5792"),
			status: "published" as const,
			publishedAt: daysAgo(5),
			createdAt: daysAgo(7),
			updatedAt: daysAgo(5)
		},
		{
			id: "post_glitch_wipe",
			slug: "glitch-wipe",
			title: "Glitch Wipe",
			body: doc(
				"A two-second digital glitch wipe for hard cuts and scene breaks. RGB split, scan lines, and block corruption in a single tight clip."
			),
			coverImage: img("1464822759023-fed622ff2c3b"),
			coverThumb: thumb("1464822759023-fed622ff2c3b"),
			status: "published" as const,
			publishedAt: daysAgo(2),
			createdAt: daysAgo(4),
			updatedAt: daysAgo(2)
		}
	];

	// Tag assignments per post (post id → tag names). Kept here instead of on
	// the post row so the seeder can normalize into `tags` + `post_tags`.
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

	// format / resolution / fileKey / previewKey / clipKey / fileSize / access / duration / isLoop / processingStatus
	const metadataData = [
		{
			postId: "post_noir_rain",
			format: "mp4" as const,
			resolution: "4K",
			duration: 30,
			isLoop: 1,
			fileKey: "assets/noir-rain-loop.mp4",
			previewKey: "previews/noir-rain-loop-480p.mp4",
			clipKey: "clips/noir-rain-loop-clip.mp4",
			fileSize: Math.round(180 * MB),
			access: "free" as const,
			processingStatus: "ready" as const
		},
		{
			postId: "post_obsidian_fog",
			format: "mp4" as const,
			resolution: "4K",
			duration: 60,
			isLoop: 1,
			fileKey: "assets/obsidian-fog.mp4",
			previewKey: "previews/obsidian-fog-480p.mp4",
			clipKey: "clips/obsidian-fog-clip.mp4",
			fileSize: Math.round(340 * MB),
			access: "premium" as const,
			processingStatus: "ready" as const
		},
		{
			postId: "post_ember_drift",
			format: "mp4" as const,
			resolution: "1080p",
			duration: 20,
			isLoop: 1,
			fileKey: "assets/ember-drift.mp4",
			previewKey: "previews/ember-drift-480p.mp4",
			clipKey: "clips/ember-drift-clip.mp4",
			fileSize: Math.round(95 * MB),
			access: "premium" as const,
			processingStatus: "ready" as const
		},
		{
			postId: "post_shattered_glass",
			format: "webm" as const,
			resolution: "4K",
			duration: 5,
			isLoop: 0,
			fileKey: "assets/shattered-glass.webm",
			previewKey: "previews/shattered-glass-480p.mp4",
			clipKey: "clips/shattered-glass-clip.mp4",
			fileSize: Math.round(210 * MB),
			access: "premium" as const,
			processingStatus: "ready" as const
		},
		{
			postId: "post_deep_space",
			format: "jpg" as const,
			resolution: "4K",
			duration: null,
			isLoop: 0,
			fileKey: "assets/deep-space.jpg",
			previewKey: null,
			clipKey: null,
			fileSize: Math.round(18 * MB),
			access: "free" as const,
			processingStatus: "ready" as const
		},
		{
			postId: "post_neon_city",
			format: "jpg" as const,
			resolution: "4K",
			duration: null,
			isLoop: 0,
			fileKey: "assets/neon-city-night.jpg",
			previewKey: null,
			clipKey: null,
			fileSize: Math.round(22 * MB),
			access: "free" as const,
			processingStatus: "ready" as const
		},
		{
			postId: "post_storm_transition",
			format: "mp4" as const,
			resolution: "1080p",
			duration: 3,
			isLoop: 0,
			fileKey: "assets/storm-transition.mp4",
			previewKey: "previews/storm-transition-480p.mp4",
			clipKey: "clips/storm-transition-clip.mp4",
			fileSize: Math.round(45 * MB),
			access: "premium" as const,
			processingStatus: "ready" as const
		},
		{
			postId: "post_blood_moon",
			format: "mp4" as const,
			resolution: "4K",
			duration: 45,
			isLoop: 1,
			fileKey: "assets/blood-moon-loop.mp4",
			previewKey: "previews/blood-moon-loop-480p.mp4",
			clipKey: "clips/blood-moon-loop-clip.mp4",
			fileSize: Math.round(260 * MB),
			access: "premium" as const,
			processingStatus: "ready" as const
		},
		{
			postId: "post_dark_forest",
			format: "jpg" as const,
			resolution: "2K",
			duration: null,
			isLoop: 0,
			fileKey: "assets/dark-forest.jpg",
			previewKey: null,
			clipKey: null,
			fileSize: Math.round(12 * MB),
			access: "premium" as const,
			processingStatus: "ready" as const
		},
		{
			postId: "post_smoke_curtain",
			format: "webm" as const,
			resolution: "1080p",
			duration: 10,
			isLoop: 1,
			fileKey: "assets/smoke-curtain.webm",
			previewKey: "previews/smoke-curtain-480p.mp4",
			clipKey: "clips/smoke-curtain-clip.mp4",
			fileSize: Math.round(75 * MB),
			access: "free" as const,
			processingStatus: "ready" as const
		},
		{
			postId: "post_void_ambience",
			format: "mp4" as const,
			resolution: "4K",
			duration: 120,
			isLoop: 1,
			fileKey: "assets/void-ambience.mp4",
			previewKey: "previews/void-ambience-480p.mp4",
			clipKey: "clips/void-ambience-clip.mp4",
			fileSize: Math.round(480 * MB),
			access: "premium" as const,
			processingStatus: "ready" as const
		},
		{
			postId: "post_glitch_wipe",
			format: "mp4" as const,
			resolution: "1080p",
			duration: 2,
			isLoop: 0,
			fileKey: "assets/glitch-wipe.mp4",
			previewKey: "previews/glitch-wipe-480p.mp4",
			clipKey: "clips/glitch-wipe-clip.mp4",
			fileSize: Math.round(30 * MB),
			access: "premium" as const,
			processingStatus: "ready" as const
		}
	];

	for (const post of postsData) {
		await db.insert(schema.posts).values(post).onConflictDoNothing();
	}

	for (const meta of metadataData) {
		await db.insert(schema.postMetadata).values(meta).onConflictDoNothing();
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
		`✓ Seeded ${postsData.length} posts, ${tagBySlug.size} tags, ${Object.values(
			postTagsMap
		).reduce((acc, t) => acc + t.length, 0)} post_tags links`
	);
	console.log(
		"  Free  : noir-rain-loop, deep-space, neon-city-night, smoke-curtain"
	);
	console.log(
		"  Premium: obsidian-fog, ember-drift, shattered-glass, storm-transition,"
	);
	console.log(
		"           blood-moon-loop, dark-forest, void-ambience, glitch-wipe"
	);

	return postsData;
}
