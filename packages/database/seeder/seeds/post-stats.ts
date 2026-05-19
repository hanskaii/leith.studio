import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../../schema";

export async function seedPostStats(
	db: DrizzleD1Database<typeof schema> | any
) {
	console.log("📊 Seeding post download stats...");

	const now = new Date();
	const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);
	const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

	// alice_pro (subscriber) — downloaded several premium + free assets
	// bob_free (free user) — only downloaded free assets
	const statsData = [
		// alice_pro downloads
		{
			id: "stat_alice_noir",
			postId: "post_noir_rain",
			userId: "user_pro_seed",
			downloadedAt: daysAgo(28)
		},
		{
			id: "stat_alice_obsidian",
			postId: "post_obsidian_fog",
			userId: "user_pro_seed",
			downloadedAt: daysAgo(26)
		},
		{
			id: "stat_alice_ember",
			postId: "post_ember_drift",
			userId: "user_pro_seed",
			downloadedAt: daysAgo(24)
		},
		{
			id: "stat_alice_deep_space",
			postId: "post_deep_space",
			userId: "user_pro_seed",
			downloadedAt: daysAgo(20)
		},
		{
			id: "stat_alice_blood_moon",
			postId: "post_blood_moon",
			userId: "user_pro_seed",
			downloadedAt: daysAgo(10)
		},
		{
			id: "stat_alice_smoke",
			postId: "post_smoke_curtain",
			userId: "user_pro_seed",
			downloadedAt: daysAgo(7)
		},
		{
			id: "stat_alice_void",
			postId: "post_void_ambience",
			userId: "user_pro_seed",
			downloadedAt: daysAgo(4)
		},
		{
			id: "stat_alice_glitch",
			postId: "post_glitch_wipe",
			userId: "user_pro_seed",
			downloadedAt: hoursAgo(6)
		},

		// bob_free downloads (free assets only)
		{
			id: "stat_bob_noir",
			postId: "post_noir_rain",
			userId: "user_free_seed",
			downloadedAt: daysAgo(14)
		},
		{
			id: "stat_bob_deep_space",
			postId: "post_deep_space",
			userId: "user_free_seed",
			downloadedAt: daysAgo(12)
		},
		{
			id: "stat_bob_neon",
			postId: "post_neon_city",
			userId: "user_free_seed",
			downloadedAt: daysAgo(3)
		},

		// admin also downloaded a few for testing
		{
			id: "stat_admin_noir",
			postId: "post_noir_rain",
			userId: "user_admin_seed",
			downloadedAt: daysAgo(29)
		},
		{
			id: "stat_admin_glitch",
			postId: "post_glitch_wipe",
			userId: "user_admin_seed",
			downloadedAt: hoursAgo(2)
		}
	];

	for (const stat of statsData) {
		await db.insert(schema.postStats).values(stat).onConflictDoNothing();
	}

	console.log(`✓ Seeded ${statsData.length} download events`);
	console.log(
		`  alice_pro  → ${statsData.filter((s) => s.userId === "user_pro_seed").length} downloads`
	);
	console.log(
		`  bob_free   → ${statsData.filter((s) => s.userId === "user_free_seed").length} downloads`
	);
	console.log(
		`  admin      → ${statsData.filter((s) => s.userId === "user_admin_seed").length} downloads`
	);

	return statsData;
}
