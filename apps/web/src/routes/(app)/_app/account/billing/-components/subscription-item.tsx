import {
	CheckmarkCircle01Icon,
	Cancel01Icon,
	Clock01Icon
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { StatusBadge } from "./status-badge";
import { formatDate, formatAmount } from "./format-utils";

export function SubscriptionItem({ sub }: { sub: any }) {
	return (
		<div className="flex items-center justify-between gap-3 px-4 py-3.5 bg-background hover:bg-muted/20 transition-colors">
			<div className="flex items-center gap-3">
				<div
					className={`size-7 rounded-lg flex items-center justify-center ${sub.status === "active" ? "bg-emerald-500/10" : "bg-muted/40"}`}
				>
					<HugeiconsIcon
						icon={
							sub.status === "active"
								? CheckmarkCircle01Icon
								: sub.status === "cancelled"
									? Cancel01Icon
									: Clock01Icon
						}
						className={`size-3.5 ${sub.status === "active" ? "text-emerald-500" : "text-muted-foreground"}`}
					/>
				</div>
				<div className="flex flex-col gap-0.5">
					<p className="text-xs font-medium leading-tight">
						{sub.productName ??
							sub.planName ??
							sub.subscriptionId ??
							"Subscription"}
					</p>
					<p className="text-[11px] text-muted-foreground">
						Since {formatDate(sub.createdAt ?? sub.startDate)}
					</p>
				</div>
			</div>
			<div className="flex items-center gap-3">
				{sub.amount != null && (
					<span className="text-xs font-medium tabular-nums">
						{formatAmount(sub.amount, sub.currency)}
						<span className="text-muted-foreground">
							{sub.interval ? `/${sub.interval}` : ""}
						</span>
					</span>
				)}
				<StatusBadge status={sub.status} />
			</div>
		</div>
	);
}
