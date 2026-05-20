import { Skeleton } from "@workspace/ui";

export function ReviewGridSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{[...Array(6)].map((_, i) => (
				<div
					key={i}
					className="rounded-lg overflow-hidden border border-border"
				>
					<Skeleton className="w-full aspect-[16/9]" />
					<div className="p-3 flex flex-col gap-2">
						<Skeleton className="h-3 w-32" />
						<Skeleton className="h-3 w-full" />
					</div>
				</div>
			))}
		</div>
	);
}
