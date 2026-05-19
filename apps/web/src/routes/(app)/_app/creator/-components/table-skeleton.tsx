export function TableSkeleton() {
	return (
		<div className="rounded-md border border-border overflow-hidden">
			{Array.from({ length: 4 }).map((_, i) => (
				<div
					key={i}
					className="flex items-center gap-4 px-4 py-4 border-b border-border/60 last:border-0"
				>
					<div className="h-4 rounded flex-1 bg-muted animate-pulse" />
					<div className="h-4 rounded w-16 bg-muted animate-pulse" />
					<div className="h-4 rounded w-24 bg-muted animate-pulse" />
				</div>
			))}
		</div>
	);
}
