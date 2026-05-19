import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { authClient } from "@/auth/client";
import {
	UserMultiple02Icon,
	UserAdd01Icon,
	DashboardSpeed01Icon,
	UserCircleIcon
} from "@hugeicons/core-free-icons";
import { Day } from "@workspace/core";
import { useMemo, Suspense } from "react";
import { StatCard } from "./-components/stat-card";
import { StatsSkeleton } from "./-components/stats-skeleton";
import { LiveTicker } from "./-components/live-ticker";
import { RecentUsersList } from "./-components/recent-users-list";
import { SignupsChart } from "./-components/signups-chart";
import { QuickInsights } from "./-components/quick-insights";
import { computeStats } from "./-lib/stats-utils";

export const Route = createFileRoute("/(app)/_admin/s/overview/")({
	component: AdminOverviewPage
});

function AdminOverviewPage() {
	const { data: session } = authClient.useSession();
	const todayLabel = Day().format("dddd, DD MMMM YYYY");

	return (
		<div className="flex flex-col gap-0 min-h-screen">
			<div className="px-6 pt-8 pb-5 flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">
						Welcome Back, {session?.user?.name ?? "Admin"}
					</h1>
					<p className="text-sm text-muted-foreground mt-0.5">
						{todayLabel}
					</p>
				</div>
			</div>

			<Suspense
				fallback={
					<div className="px-6">
						<StatsSkeleton />
					</div>
				}
			>
				<OverviewContent />
			</Suspense>
		</div>
	);
}

function OverviewContent() {
	const { data: usersData } = useSuspenseQuery({
		queryKey: ["admin", "users"],
		queryFn: async () => {
			const { data, error } = await authClient.admin.listUsers({
				query: {
					limit: 100,
					sortBy: "createdAt",
					sortDirection: "desc"
				}
			});
			if (error) throw new Error(error.message);
			return data;
		}
	});

	const stats = useMemo(() => computeStats(usersData), [usersData]);

	const chartData = stats.last7.map((count, i) => {
		const d = Day().subtract(6 - i, "day");
		return { day: d.format("ddd"), count };
	});

	return (
		<>
			<div className="px-6 pb-1 text-xs text-muted-foreground border border-border rounded-lg mx-6 flex items-center gap-1.5 py-1.5 bg-muted/10 w-fit">
				<span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
				Admin dashboard — {stats.total} total users
			</div>

			<div className="px-6 mt-5 grid grid-cols-2 gap-4">
				<StatCard
					label="Total Users"
					sublabel="All registered accounts"
					value={stats.total}
					icon={UserMultiple02Icon}
					sparkData={stats.last7.map((_, i) =>
						stats.last7.slice(0, i + 1).reduce((a, b) => a + b, 0)
					)}
					color="#6366f1"
				/>
				<StatCard
					label="New Today"
					sublabel="Last 24 hours"
					value={stats.newToday}
					change={0}
					icon={UserAdd01Icon}
					sparkData={stats.last7}
					color="#10b981"
				/>
				<StatCard
					label="Admins"
					sublabel="Admin role accounts"
					value={stats.adminCount}
					icon={DashboardSpeed01Icon}
					color="#f59e0b"
				/>
				<StatCard
					label="Banned"
					sublabel="Currently restricted"
					value={stats.bannedCount}
					icon={UserCircleIcon}
					color="#ef4444"
				/>
			</div>

			<div className="mt-6">
				<LiveTicker />
			</div>

			<div className="px-6 mt-6 grid grid-cols-1 gap-4">
				<RecentUsersList users={stats.recentUsers} />

				<div className="flex flex-col gap-4">
					<SignupsChart chartData={chartData} />
					<QuickInsights
						total={stats.total}
						adminCount={stats.adminCount}
						bannedCount={stats.bannedCount}
						newToday={stats.newToday}
						thisWeek={stats.last7.reduce((a, b) => a + b, 0)}
					/>
				</div>
			</div>

			<div className="pb-10" />
		</>
	);
}
