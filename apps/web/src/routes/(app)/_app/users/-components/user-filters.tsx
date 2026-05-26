import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type RoleFilter = "all" | "admin" | "user";
type StatusFilter = "all" | "banned" | "active";

export function UserFilters({
	search,
	onSearchChange,
	roleFilter,
	onRoleChange,
	statusFilter,
	onStatusChange
}: {
	search: string;
	onSearchChange: (value: string) => void;
	roleFilter: RoleFilter;
	onRoleChange: (value: RoleFilter) => void;
	statusFilter: StatusFilter;
	onStatusChange: (value: StatusFilter) => void;
}) {
	return (
		<div className="px-6 flex flex-wrap items-center gap-3 pb-4">
			<div className="relative flex-1 min-w-55 max-w-sm">
				<HugeiconsIcon
					icon={Search01Icon}
					className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
				/>
				<input
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder="Search by email..."
					className="w-full pl-9 pr-3 h-9 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
				/>
			</div>

			<div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-muted/10">
				{(["all", "admin", "user"] as const).map((r) => (
					<button
						key={r}
						onClick={() => onRoleChange(r)}
						className={`text-xs px-3 py-1 rounded-md capitalize transition-colors ${roleFilter === r ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
					>
						{r}
					</button>
				))}
			</div>

			<div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-muted/10">
				{(["all", "active", "banned"] as const).map((s) => (
					<button
						key={s}
						onClick={() => onStatusChange(s)}
						className={`text-xs px-3 py-1 rounded-md capitalize transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
					>
						{s}
					</button>
				))}
			</div>
		</div>
	);
}
