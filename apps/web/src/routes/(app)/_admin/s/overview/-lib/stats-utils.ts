import { Day } from "@workspace/core";

export function computeStats(usersData: any) {
	const users = usersData?.users ?? [];
	const total = usersData?.total ?? 0;

	const now = Day();
	const last7Buckets = Array(7).fill(0);

	const dayStrings = Array.from({ length: 7 }, (_, i) =>
		now.subtract(6 - i, "day").format("YYYY-MM-DD")
	);

	const todayStr = now.format("YYYY-MM-DD");
	let newToday = 0;
	let bannedCount = 0;
	let adminCount = 0;

	for (const u of users) {
		const uDate = Day(u.createdAt);
		if (!uDate.isValid()) continue;

		const uStr = uDate.format("YYYY-MM-DD");

		if (uStr === todayStr) {
			newToday++;
		}

		const bucketIndex = dayStrings.indexOf(uStr);
		if (bucketIndex !== -1) {
			last7Buckets[bucketIndex]++;
		}

		if (u.role === "admin") adminCount++;
		if ((u as any).banned) bannedCount++;
	}

	return {
		total,
		newToday,
		last7: last7Buckets,
		bannedCount,
		adminCount,
		recentUsers: users.slice(0, 5)
	};
}
