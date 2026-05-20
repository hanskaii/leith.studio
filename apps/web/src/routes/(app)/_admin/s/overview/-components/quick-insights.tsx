import { Idea01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type Props = {
	total: number;
	adminCount: number;
	bannedCount: number;
	newToday: number;
	thisWeek: number;
};

export function QuickInsights({
	total,
	adminCount,
	bannedCount,
	newToday,
	thisWeek
}: Props) {
	return (
		<div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
			<div className="flex items-center gap-1.5">
				<HugeiconsIcon
					icon={Idea01Icon}
					className="size-4 text-yellow-500"
				/>
				<p className="text-sm font-semibold">Quick Insights</p>
			</div>
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between text-xs">
					<span className="text-muted-foreground">Total users</span>
					<span className="font-semibold tabular-nums">{total}</span>
				</div>
				<div className="flex items-center justify-between text-xs">
					<span className="text-muted-foreground">Admins</span>
					<span className="font-semibold tabular-nums">
						{adminCount}
					</span>
				</div>
				<div className="flex items-center justify-between text-xs">
					<span className="text-muted-foreground">Banned</span>
					<span className="font-semibold tabular-nums text-destructive">
						{bannedCount}
					</span>
				</div>
				<div className="flex items-center justify-between text-xs">
					<span className="text-muted-foreground">New today</span>
					<span className="font-semibold tabular-nums text-emerald-500">
						{newToday}
					</span>
				</div>
				<div className="flex items-center justify-between text-xs">
					<span className="text-muted-foreground">This week</span>
					<span className="font-semibold tabular-nums">
						{thisWeek}
					</span>
				</div>
			</div>
		</div>
	);
}
