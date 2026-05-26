import { Skeleton } from "@workspace/ui";

function StatCardSkeleton() {
	return (
		<div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
			<div className="flex items-start justify-between">
				<div className="flex flex-col gap-1.5">
					<Skeleton className="h-3 w-20" />
					<Skeleton className="h-2.5 w-24" />
				</div>
				<Skeleton className="size-8 rounded-lg" />
			</div>
			<Skeleton className="h-8 w-16" />
			<div className="flex items-end justify-between">
				<Skeleton className="h-3 w-12" />
				<Skeleton className="h-10 w-32" />
			</div>
		</div>
	);
}

export function StatsSkeleton() {
	return (
		<>
			{Array.from({ length: 4 }).map((_, i) => (
				<StatCardSkeleton key={i} />
			))}
		</>
	);
}
