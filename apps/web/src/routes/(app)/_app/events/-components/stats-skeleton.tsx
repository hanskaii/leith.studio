import { Skeleton } from "@workspace/ui";

export function StatsSkeleton() {
	return (
		<div className="grid grid-cols-5 divide-x divide-border border border-border rounded-xl bg-card overflow-hidden">
			{Array.from({ length: 5 }).map((_, i) => (
				<div
					key={i}
					className="flex flex-col items-center gap-2.5 py-4 px-2"
				>
					<Skeleton className="h-8 w-12 rounded-lg" />
					<Skeleton className="h-3 w-16" />
				</div>
			))}
		</div>
	);
}
