import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { authClient } from "@/auth/client";
import {
	UserMultiple02Icon,
	UserAdd01Icon,
	Calendar01Icon,
	DashboardSpeed01Icon,
	Idea01Icon,
	UserCircleIcon
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Day } from "@workspace/core";
import { useMemo, Suspense } from "react";
import { StatCard } from "./-components/stat-card";
import { StatsSkeleton } from "./-components/stats-skeleton";
import { LiveTicker } from "./-components/live-ticker";

import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig
} from "@workspace/ui";
import { Bar, BarChart, XAxis, CartesianGrid } from "recharts";

export const Route = createFileRoute("/(app)/_admin/s/overview/")({
	component: AdminOverviewPage
});

function AdminOverviewPage() {
	const { data: session } = authClient.useSession();
	const todayLabel = Day().format("dddd, DD MMMM YYYY");

	return (
		<div className="flex flex-col gap-0 min-h-screen">
			{/* Header */}
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

	const stats = useMemo(() => {
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
	}, [usersData]);

	const chartData = useMemo(() => {
		return stats.last7.map((count, i) => {
			const d = Day().subtract(6 - i, "day");
			return {
				day: d.format("ddd"),
				count
			};
		});
	}, [stats.last7]);

	const chartConfig = {
		count: {
			label: "Signups",
			color: "hsl(var(--primary))"
		}
	} satisfies ChartConfig;

	return (
		<>
			<div className="px-6 pb-1 text-xs text-muted-foreground border border-border rounded-lg mx-6 flex items-center gap-1.5 py-1.5 bg-muted/10 w-fit">
				<span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
				Admin dashboard — {stats.total} total users
			</div>

			{/* Stat Cards */}
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

			{/* Live Ticker */}
			<div className="mt-6">
				<LiveTicker />
			</div>

			{/* Recent Users + Stats Row */}
			<div className="px-6 mt-6 grid grid-cols-1 gap-4">
				{/* Recent Users */}
				<div className="rounded-xl border border-border bg-card overflow-hidden">
					<div className="flex items-center justify-between px-5 py-4 border-b border-border">
						<div>
							<p className="text-sm font-semibold">
								Recent Users
							</p>
							<p className="text-xs text-muted-foreground">
								Latest signups
							</p>
						</div>
						<span className="text-xs text-muted-foreground">
							Last 5
						</span>
					</div>

					{stats.recentUsers.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-16 gap-2">
							<HugeiconsIcon
								icon={UserMultiple02Icon}
								className="size-8 text-muted-foreground/30"
							/>
							<p className="text-sm text-muted-foreground">
								No users yet
							</p>
						</div>
					) : (
						<div className="divide-y divide-border">
							{stats.recentUsers.map((user) => (
								<div
									key={user.id}
									className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors"
								>
									<div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">
										{user.name?.charAt(0)?.toUpperCase() ??
											"?"}
									</div>
									<div className="flex flex-col gap-0.5 min-w-0 flex-1">
										<p className="text-xs font-medium truncate">
											{user.name ?? "—"}
										</p>
										<p className="text-[11px] text-muted-foreground truncate">
											{user.email}
										</p>
									</div>
									<div className="flex items-center gap-2 shrink-0">
										{user.role === "admin" && (
											<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
												Admin
											</span>
										)}
										{(user as any).banned && (
											<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20">
												Banned
											</span>
										)}
										<span className="text-[11px] text-muted-foreground">
											{Day.timeAgo(user.createdAt)}
										</span>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Stats sidebar */}
				<div className="flex flex-col gap-4">
					{/* Signups last 7 days */}
					<div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
						<div className="flex items-center justify-between">
							<p className="text-sm font-semibold">
								Signups — Last 7 Days
							</p>
							<HugeiconsIcon
								icon={Calendar01Icon}
								className="size-4 text-muted-foreground"
							/>
						</div>
						<ChartContainer
							config={chartConfig}
							className="min-h-30 w-full"
						>
							<BarChart data={chartData}>
								<CartesianGrid
									vertical={false}
									strokeDasharray="3 3"
									className="stroke-muted-foreground/10"
								/>
								<XAxis
									dataKey="day"
									tickLine={false}
									tickMargin={10}
									axisLine={false}
									tickFormatter={(value) => value[0]}
									className="text-[10px] fill-muted-foreground"
								/>
								<ChartTooltip
									cursor={false}
									content={<ChartTooltipContent hideLabel />}
								/>
								<Bar
									dataKey="count"
									fill="var(--color-count)"
									radius={4}
								/>
							</BarChart>
						</ChartContainer>
					</div>

					{/* Quick Insights */}
					<div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
						<div className="flex items-center gap-1.5">
							<HugeiconsIcon
								icon={Idea01Icon}
								className="size-4 text-yellow-500"
							/>
							<p className="text-sm font-semibold">
								Quick Insights
							</p>
						</div>
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between text-xs">
								<span className="text-muted-foreground">
									Total users
								</span>
								<span className="font-semibold tabular-nums">
									{stats.total}
								</span>
							</div>
							<div className="flex items-center justify-between text-xs">
								<span className="text-muted-foreground">
									Admins
								</span>
								<span className="font-semibold tabular-nums">
									{stats.adminCount}
								</span>
							</div>
							<div className="flex items-center justify-between text-xs">
								<span className="text-muted-foreground">
									Banned
								</span>
								<span className="font-semibold tabular-nums text-destructive">
									{stats.bannedCount}
								</span>
							</div>
							<div className="flex items-center justify-between text-xs">
								<span className="text-muted-foreground">
									New today
								</span>
								<span className="font-semibold tabular-nums text-emerald-500">
									{stats.newToday}
								</span>
							</div>
							<div className="flex items-center justify-between text-xs">
								<span className="text-muted-foreground">
									This week
								</span>
								<span className="font-semibold tabular-nums">
									{stats.last7.reduce((a, b) => a + b, 0)}
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Footer padding */}
			<div className="pb-10" />
		</>
	);
}
