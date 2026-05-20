import { Skeleton } from "@workspace/ui";

export function TableSkeleton() {
	return (
		<div className="rounded-md border border-border overflow-hidden">
			{Array.from({ length: 4 }).map((_, i) => (
				<div
					key={i}
					className="flex items-center gap-4 px-4 py-4 border-b border-border/60 last:border-0"
				>
					<Skeleton className="h-4 rounded flex-1" />
					<Skeleton className="h-4 rounded w-16" />
					<Skeleton className="h-4 rounded w-24" />
				</div>
			))}
		</div>
	);
}
