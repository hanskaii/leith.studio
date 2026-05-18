import { Skeleton } from "@workspace/ui";

export function TableSkeleton() {
	return (
		<div className="divide-y divide-border">
			{Array.from({ length: 8 }).map((_, i) => (
				<div key={i} className="flex items-center gap-4 px-4 py-3">
					<div className="flex items-center gap-3 flex-1">
						<Skeleton className="size-7 rounded-full" />
						<Skeleton className="h-3 w-24" />
					</div>
					<Skeleton className="h-3 w-36 flex-1" />
					<Skeleton className="h-3 w-16" />
					<Skeleton className="h-5 w-12 rounded-md" />
					<Skeleton className="h-5 w-14 rounded-md" />
					<Skeleton className="size-7 rounded-lg" />
				</div>
			))}
		</div>
	);
}
