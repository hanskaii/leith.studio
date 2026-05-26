import { Skeleton } from "@workspace/ui";

export function RecentUsersSkeleton() {
	return (
		<div className="divide-y divide-border">
			{Array.from({ length: 5 }).map((_, i) => (
				<div key={i} className="flex items-center gap-3 px-5 py-3">
					<Skeleton className="size-8 rounded-full" />
					<div className="flex flex-col gap-1.5 flex-1">
						<Skeleton className="h-3 w-24" />
						<Skeleton className="h-2.5 w-32" />
					</div>
					<div className="flex items-center gap-2">
						<Skeleton className="h-3 w-12" />
					</div>
				</div>
			))}
		</div>
	);
}
