import type { EventType } from "./event-meta";

export function StatsStrip({
	counts
}: {
	counts: Record<EventType | "all", number>;
}) {
	const stats = [
		{
			label: "Signups",
			count: counts.signup ?? 0,
			color: "text-emerald-500"
		},
		{
			label: "Sign-ins",
			count: counts.signin ?? 0,
			color: "text-blue-500"
		},
		{ label: "Bans", count: counts.ban ?? 0, color: "text-destructive" },
		{
			label: "Role changes",
			count: counts.role_change ?? 0,
			color: "text-amber-500"
		},
		{
			label: "Deletions",
			count: counts.account_delete ?? 0,
			color: "text-rose-500"
		}
	];

	return (
		<div className="grid grid-cols-5 divide-x divide-border border border-border rounded-xl bg-card overflow-hidden">
			{stats.map((s) => (
				<div
					key={s.label}
					className="flex flex-col items-center gap-1 py-4"
				>
					<span
						className={`text-2xl font-bold tabular-nums ${s.color}`}
					>
						{s.count}
					</span>
					<span className="text-[11px] text-muted-foreground">
						{s.label}
					</span>
				</div>
			))}
		</div>
	);
}
