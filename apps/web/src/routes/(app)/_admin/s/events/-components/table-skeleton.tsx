import { Skeleton } from "@workspace/ui";

export function TableSkeleton() {
	return (
		<div className="divide-y divide-border">
			{Array.from({ length: 5 }).map((_, i) => (
				<div key={i} className="flex items-center gap-4 px-6 py-4">
					<div className="flex items-center gap-3 flex-1">
						<Skeleton className="size-8 rounded-lg" />
						<Skeleton className="h-4 w-24" />
					</div>
					<div className="flex flex-col gap-1.5 flex-1">
						<Skeleton className="h-3 w-32" />
						<Skeleton className="h-2.5 w-20" />
					</div>
					<div className="flex flex-col items-end gap-1.5 shrink-0">
						<Skeleton className="h-3 w-16" />
						<Skeleton className="h-2.5 w-12" />
					</div>
				</div>
			))}
		</div>
	);
}
