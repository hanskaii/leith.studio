import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { authClient } from "@/auth/client";
import { useState, useMemo, Suspense } from "react";
import {
	flexRender,
	getCoreRowModel,
	useReactTable,
	createColumnHelper
} from "@tanstack/react-table";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from "@workspace/ui";
import { Activity01Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Day } from "@workspace/core";
import {
	EVENT_META,
	type EventType,
	type DerivedEvent
} from "./-components/event-meta";
import { LiveDot } from "./-components/live-dot";
import { StatsStrip } from "./-components/stats-strip";
import { TableSkeleton } from "./-components/table-skeleton";
import { StatsSkeleton } from "./-components/stats-skeleton";

export const Route = createFileRoute("/(app)/_admin/s/events/")({
	component: AdminEventsPage
});

const EVENT_TYPES: Array<EventType | "all"> = [
	"all",
	"signup",
	"signin",
	"ban",
	"role_change",
	"account_delete"
];

function AdminEventsPage() {
	const [typeFilter, setTypeFilter] = useState<EventType | "all">("all");
	const [autoRefresh, setAutoRefresh] = useState(true);

	return (
		<div className="flex flex-col gap-0 min-h-screen">
			{/* Header */}
			<div className="px-6 pt-8 pb-5 flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">
						Events
					</h1>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={() => setAutoRefresh((v) => !v)}
						className={`flex items-center gap-1.5 text-xs border border-border rounded-lg px-3 py-1.5 transition-colors ${autoRefresh ? `bg-emerald-500/10 text-emerald-500 border-emerald-500/20` : `text-muted-foreground hover:bg-muted/20`}`}
					>
						<LiveDot />
						{autoRefresh ? "Live" : "Paused"}
					</button>
				</div>
			</div>

			<Suspense
				fallback={
					<div className="px-6 flex flex-col gap-5">
						<StatsSkeleton />
						<TableSkeleton />
					</div>
				}
			>
				<EventsContent
					typeFilter={typeFilter}
					autoRefresh={autoRefresh}
					onTypeFilterChange={setTypeFilter}
				/>
			</Suspense>
		</div>
	);
}

const columnHelper = createColumnHelper<DerivedEvent>();

type EventsContentProps = {
	typeFilter: EventType | "all";
	autoRefresh: boolean;
	onTypeFilterChange: (t: EventType | "all") => void;
};

function EventsContent({
	typeFilter,
	autoRefresh,
	onTypeFilterChange
}: EventsContentProps) {
	const {
		data: usersData,
		refetch,
		isFetching
	} = useSuspenseQuery({
		queryKey: ["admin", "events", "users"],
		queryFn: async () => {
			const { data, error } = await authClient.admin.listUsers({
				query: {
					limit: 100,
					sortBy: "createdAt",
					sortDirection: "desc"
				}
			});
			if (error) throw error;
			return data;
		},
		refetchInterval: autoRefresh ? 10000 : false
	});

	const { events, counts } = useMemo(() => {
		const derived: DerivedEvent[] = [];
		const c: Record<EventType | "all", number> = {
			signup: 0,
			signin: 0,
			signout: 0,
			ban: 0,
			unban: 0,
			role_change: 0,
			account_delete: 0,
			session_revoke: 0,
			all: 0
		};

		const users = (usersData?.users ?? []) as any[];

		for (const u of users) {
			const signup: DerivedEvent = {
				id: `signup-${u.id}`,
				type: "signup",
				userId: u.id,
				userName: u.name,
				userEmail: u.email,
				detail: u.emailVerified ? "Email verified" : "Email unverified",
				createdAt: new Date(u.createdAt)
			};
			derived.push(signup);
			c.signup++;

			if (u.banned) {
				const ban: DerivedEvent = {
					id: `ban-${u.id}`,
					type: "ban",
					userId: u.id,
					userName: u.name,
					userEmail: u.email,
					detail: u.banReason || undefined,
					createdAt: new Date(u.banExpires ?? u.createdAt)
				};
				derived.push(ban);
				c.ban++;
			}

			if (u.role === "admin") {
				const role: DerivedEvent = {
					id: `role-${u.id}`,
					type: "role_change",
					userId: u.id,
					userName: u.name,
					userEmail: u.email,
					detail: "Promoted to admin",
					createdAt: new Date(u.updatedAt ?? u.createdAt)
				};
				derived.push(role);
				c.role_change++;
			}
		}

		c.all = derived.length;

		return {
			events: derived.sort(
				(a, b) => b.createdAt.getTime() - a.createdAt.getTime()
			),
			counts: c
		};
	}, [usersData]);

	const filtered = useMemo(() => {
		if (typeFilter === "all") return events;
		return events.filter((e) => e.type === typeFilter);
	}, [events, typeFilter]);

	const columns = useMemo(
		() => [
			columnHelper.accessor("type", {
				header: "Event",
				cell: (info) => {
					const meta = EVENT_META[info.getValue()];
					return (
						<div className="flex items-center gap-3">
							<div
								className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}
							>
								<HugeiconsIcon
									icon={meta.icon}
									className={`size-4 ${meta.color}`}
								/>
							</div>
							<span className="text-xs font-semibold">
								{meta.label}
							</span>
						</div>
					);
				}
			}),
			columnHelper.display({
				id: "detail",
				header: "User / Detail",
				cell: (info) => {
					const event = info.row.original;
					return (
						<div className="flex flex-col gap-0.5 min-w-0">
							<span className="text-[11px] text-muted-foreground truncate">
								{event.userEmail || event.userId}
							</span>
							{event.detail && (
								<span className="text-[11px] text-muted-foreground/70 italic">
									{event.detail}
								</span>
							)}
						</div>
					);
				}
			}),
			columnHelper.accessor("createdAt", {
				header: "Time",
				cell: (info) => (
					<div className="flex flex-col items-end gap-0.5">
						<span className="text-[11px] font-medium text-muted-foreground">
							{Day.timeAgo(info.getValue())}
						</span>
						<span className="text-[10px] text-muted-foreground/50">
							{Day(info.getValue()).format("MMM D, HH:mm")}
						</span>
					</div>
				)
			})
		],
		[]
	);

	const table = useReactTable({
		data: filtered,
		columns,
		getCoreRowModel: getCoreRowModel()
	});

	return (
		<>
			<p className="px-6 pb-5 text-sm text-muted-foreground">
				{events.length} tracked events
			</p>

			{/* Stats strip */}
			<div className="px-6 pb-5">
				<StatsStrip counts={counts} />
			</div>

			{/* Manual refresh */}
			<div className="px-6 pb-4 flex items-center justify-end">
				<button
					onClick={() => refetch()}
					disabled={isFetching}
					className="flex items-center gap-1.5 text-xs border border-border rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-muted/20 transition-colors disabled:opacity-50"
				>
					<HugeiconsIcon
						icon={RefreshIcon}
						className={`size-3.5 ${isFetching ? "animate-spin" : ""}`}
					/>
					Refresh
				</button>
			</div>

			{/* Type filter */}
			<div className="px-6 pb-4 flex items-center gap-1.5 flex-wrap">
				{EVENT_TYPES.map((t) => {
					const meta = t === "all" ? null : EVENT_META[t];
					const count = counts[t] ?? 0;
					return (
						<button
							key={t}
							onClick={() => onTypeFilterChange(t)}
							className={`flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 transition-colors ${
								typeFilter === t
									? "bg-primary text-primary-foreground border-primary font-medium"
									: "border-border text-muted-foreground hover:bg-muted/20"
							}`}
						>
							{meta && (
								<HugeiconsIcon
									icon={meta.icon}
									className="size-3"
								/>
							)}
							<span className="capitalize">
								{t === "all" ? "All" : meta?.label}
							</span>
							<span
								className={`text-[10px] px-1 rounded ${typeFilter === t ? `bg-white/20` : `bg-muted/30`}`}
							>
								{count}
							</span>
						</button>
					);
				})}
			</div>

			{/* Events list */}
			<div className="px-6 pb-10">
				<div className="rounded-xl border border-border bg-card overflow-hidden">
					{filtered.length === 0 ? (
						<div className="flex flex-col items-center justify-center gap-2 py-20">
							<HugeiconsIcon
								icon={Activity01Icon}
								className="size-8 text-muted-foreground/30"
							/>
							<p className="text-sm text-muted-foreground">
								No events found
							</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow key={headerGroup.id}>
										{headerGroup.headers.map((header) => (
											<TableHead
												key={header.id}
												className="text-[11px] uppercase tracking-wider bg-muted/5 py-4"
											>
												{header.isPlaceholder
													? null
													: flexRender(
															header.column
																.columnDef
																.header,
															header.getContext()
														)}
											</TableHead>
										))}
									</TableRow>
								))}
							</TableHeader>
							<TableBody>
								{table.getRowModel().rows.map((row) => (
									<TableRow
										key={row.id}
										className="hover:bg-muted/5 transition-colors border-b border-border last:border-0"
									>
										{row.getVisibleCells().map((cell) => (
											<TableCell
												key={cell.id}
												className="py-3"
											>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext()
												)}
											</TableCell>
										))}
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</div>
			</div>
		</>
	);
}
