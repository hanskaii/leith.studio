import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../../schema";

export async function seedUsers(db: DrizzleD1Database<typeof schema> | any) {
	console.log("👤 Seeding users and auth records...");

	const now = new Date();
	const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

	const usersData = [
		{
			id: "user_admin_seed",
			name: "Admin",
			username: "admin",
			email: "admin@example.com",
			emailVerified: true,
			image: null,
			role: "admin",
			banned: false,
			banReason: null,
			banExpires: null,
			dodoCustomerId: null,
			subscriptionStatus: null,
			subscriptionId: null,
			subscriptionPlanId: null,
			credits: 0,
			createdAt: daysAgo(90),
			updatedAt: daysAgo(1)
		},
		{
			id: "user_pro_seed",
			name: "Alice Pro",
			username: "alice_pro",
			email: "alice@example.com",
			emailVerified: true,
			image: null,
			role: "user",
			banned: false,
			banReason: null,
			banExpires: null,
			dodoCustomerId: "cust_alice_seed",
			subscriptionStatus: "active",
			subscriptionId: "sub_alice_seed",
			subscriptionPlanId: "pdt_pro_replace_me",
			credits: 0,
			createdAt: daysAgo(30),
			updatedAt: daysAgo(0)
		},
		{
			id: "user_free_seed",
			name: "Bob Free",
			username: "bob_free",
			email: "bob@example.com",
			emailVerified: true,
			image: null,
			role: "user",
			banned: false,
			banReason: null,
			banExpires: null,
			dodoCustomerId: null,
			subscriptionStatus: null,
			subscriptionId: null,
			subscriptionPlanId: null,
			credits: 0,
			createdAt: daysAgo(14),
			updatedAt: daysAgo(2)
		},
		{
			id: "user_credits_seed",
			name: "Carol Credits",
			username: "carol_credits",
			email: "carol@example.com",
			emailVerified: false,
			image: null,
			role: "user",
			banned: false,
			banReason: null,
			banExpires: null,
			dodoCustomerId: "cust_carol_seed",
			subscriptionStatus: null,
			subscriptionId: null,
			subscriptionPlanId: null,
			credits: 10000,
			createdAt: daysAgo(7),
			updatedAt: daysAgo(0)
		},
		{
			id: "user_banned_seed",
			name: "Dave Banned",
			username: "dave_banned",
			email: "dave@example.com",
			emailVerified: true,
			image: null,
			role: "user",
			banned: true,
			banReason: "Violation of terms of service",
			banExpires: null,
			dodoCustomerId: null,
			subscriptionStatus: null,
			subscriptionId: null,
			subscriptionPlanId: null,
			credits: 0,
			createdAt: daysAgo(60),
			updatedAt: daysAgo(5)
		}
	];

	// Seed Users
	for (const user of usersData) {
		await db.insert(schema.users).values(user).onConflictDoNothing();

		// Seed corresponding Account records for Better Auth
		// This ensures users can "log in" via the specified provider
		await db
			.insert(schema.accounts)
			.values({
				id: `acc_${user.id}`,
				userId: user.id,
				accountId: user.id,
				providerId: user.email.includes("google")
					? "google"
					: "email-otp",
				createdAt: user.createdAt,
				updatedAt: user.updatedAt
			})
			.onConflictDoNothing();
	}

	// Seed Admin API Key (for testing apiKey plugin features)
	await db
		.insert(schema.apiKeys)
		.values({
			id: "ak_admin_seed",
			key: "tanflare_admin_test_key",
			referenceId: "user_admin_seed",
			name: "Admin Dev Key",
			createdAt: daysAgo(90),
			updatedAt: daysAgo(1)
		})
		.onConflictDoNothing();

	console.log(`✓ Seeded ${usersData.length} users with auth records`);
	console.log(
		"  admin@example.com     → admin (API Key: tanflare_admin_test_key)"
	);
	console.log("  alice@example.com     → pro subscriber");
	console.log("  bob@example.com       → free user");
	console.log("  carol@example.com     → 10k credits (unverified)");
	console.log("  dave@example.com      → banned");

	return usersData;
}
