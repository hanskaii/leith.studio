import { ArrowUp01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Sparkline } from "./sparkline";

export function StatCard({
	label,
	sublabel,
	value,
	change,
	icon,
	sparkData,
	color = "#6366f1"
}: {
	label: string;
	sublabel: string;
	value: number | string;
	change?: number;
	icon: any;
	sparkData?: number[];
	color?: string;
}) {
	const isUp = (change ?? 0) >= 0;
	return (
		<div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
			<div className="flex items-start justify-between">
				<div className="flex flex-col gap-0.5">
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
						{label}
					</p>
					<p className="text-[11px] text-muted-foreground/60">
						{sublabel}
					</p>
				</div>
				<div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
					<HugeiconsIcon
						icon={icon}
						className="size-4 text-primary"
					/>
				</div>
			</div>
			<p className="text-3xl font-bold tabular-nums tracking-tight">
				{value}
			</p>
			<div className="flex items-center min-h-5">
				{change !== undefined && (
					<span
						className={`flex items-center gap-1 text-xs font-medium ${isUp ? `text-emerald-500` : `text-destructive`}`}
					>
						<HugeiconsIcon
							icon={isUp ? ArrowUp01Icon : ArrowDown01Icon}
							className="size-3.5"
						/>
						{Math.abs(change).toFixed(1)}%
					</span>
				)}
			</div>
			{sparkData && (
				<div className="mt-2 -mx-5 -mb-5 overflow-hidden rounded-b-xl">
					<Sparkline data={sparkData} color={color} />
				</div>
			)}
		</div>
	);
}
