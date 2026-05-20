import { Skeleton } from "@workspace/ui";

export function TopicsTableSkeleton() {
	return (
		<div
			className="rounded-md border overflow-hidden"
			style={{ borderColor: "oklch(0.88 0.008 80)" }}
		>
			{[...Array(3)].map((_, i) => (
				<div
					key={i}
					className="flex gap-4 px-4 py-3 border-b"
					style={{ borderColor: "oklch(0.88 0.008 80)" }}
				>
					<Skeleton className="h-4 w-48 rounded" />
					<Skeleton className="h-4 w-20 rounded" />
				</div>
			))}
		</div>
	);
}
