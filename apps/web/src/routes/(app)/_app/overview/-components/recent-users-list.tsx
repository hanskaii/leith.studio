import { Day } from "@workspace/core";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserMultiple02Icon } from "@hugeicons/core-free-icons";

type Props = {
	users: any[];
};

export function RecentUsersList({ users }: Props) {
	return (
		<div className="rounded-xl border border-border bg-card overflow-hidden">
			<div className="flex items-center justify-between px-5 py-4 border-b border-border">
				<div>
					<p className="text-sm font-semibold">Recent Users</p>
					<p className="text-xs text-muted-foreground">
						Latest signups
					</p>
				</div>
				<span className="text-xs text-muted-foreground">Last 5</span>
			</div>

			{users.length === 0 ? (
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
					{users.map((user) => (
						<div
							key={user.id}
							className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors"
						>
							<div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">
								{user.name?.charAt(0)?.toUpperCase() ?? "?"}
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
	);
}
