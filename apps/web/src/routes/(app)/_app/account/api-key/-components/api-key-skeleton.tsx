import { Skeleton } from "@workspace/ui";

function ApiKeyItemSkeleton() {
	return (
		<div className="rounded-xl border border-border p-4 bg-muted/20 flex items-center gap-3">
			<div className="flex flex-col gap-2 flex-1">
				<Skeleton className="h-3.5 w-32" />
				<Skeleton className="h-3 w-56" />
			</div>
			<Skeleton className="size-8 rounded-lg shrink-0" />
		</div>
	);
}

export function ApiKeySkeleton({ rows = 3 }: { rows?: number }) {
	return (
		<div className="flex flex-col gap-3">
			{Array.from({ length: rows }).map((_, i) => (
				<ApiKeyItemSkeleton key={i} />
			))}
		</div>
	);
}
