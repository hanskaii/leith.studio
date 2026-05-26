import { Skeleton } from "@workspace/ui";

export function StudioGridSkeleton() {
	return (
		<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{Array.from({ length: 10 }).map((_, i) => (
				<div key={i} className="flex flex-col gap-2">
					<Skeleton className="aspect-[3/4] rounded-md" />
					<Skeleton className="h-3 w-3/4 rounded" />
				</div>
			))}
		</div>
	);
}
