import { Badge } from "@workspace/ui";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
	active: {
		label: "Active",
		className:
			"bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
	},
	cancelled: {
		label: "Cancelled",
		className: "bg-destructive/10 text-destructive border-destructive/20"
	},
	on_hold: {
		label: "On Hold",
		className:
			"bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400"
	},
	expired: {
		label: "Expired",
		className: "bg-muted text-muted-foreground"
	},
	failed: {
		label: "Failed",
		className: "bg-destructive/10 text-destructive border-destructive/20"
	},
	succeeded: {
		label: "Succeeded",
		className:
			"bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
	}
};

export function StatusBadge({ status }: { status?: string }) {
	if (!status || status === "No Active Plan") {
		return (
			<Badge
				variant="secondary"
				className="text-[10px] font-medium capitalize"
			>
				No Plan
			</Badge>
		);
	}
	const config = STATUS_MAP[status] ?? {
		label: status,
		className: "bg-muted text-muted-foreground"
	};
	return (
		<Badge
			variant="outline"
			className={`text-[10px] font-semibold capitalize ${config.className}`}
		>
			{config.label}
		</Badge>
	);
}
