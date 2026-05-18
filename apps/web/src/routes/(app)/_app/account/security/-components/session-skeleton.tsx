import { Skeleton } from "@workspace/ui";

function SessionItemSkeleton() {
	return (
		<div className="rounded-xl border border-border p-4 bg-muted/20 flex items-center gap-3">
			<Skeleton className="size-10 rounded-lg shrink-0" />
			<div className="flex flex-col gap-2 flex-1">
				<Skeleton className="h-3.5 w-32" />
				<Skeleton className="h-3 w-48" />
			</div>
			<Skeleton className="h-9 w-16 rounded-lg shrink-0" />
		</div>
	);
}

function ProviderItemSkeleton() {
	return (
		<div className="rounded-xl border border-border p-4 bg-muted/20 flex items-center gap-3">
			<Skeleton className="size-10 rounded-lg shrink-0" />
			<div className="flex flex-col gap-2 flex-1">
				<Skeleton className="h-3.5 w-20" />
				<Skeleton className="h-2.5 w-24" />
			</div>
			<Skeleton className="h-9 w-24 rounded-lg shrink-0" />
		</div>
	);
}

export function SecuritySkeleton() {
	return (
		<div className="flex flex-col gap-10 w-full mt-2 pb-10">
			{/* Sessions */}
			<section className="flex flex-col gap-6">
				<div className="flex flex-col gap-1">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-3 w-72 mt-1" />
					<Skeleton className="h-3 w-56" />
				</div>
				<div className="flex flex-col gap-3">
					{Array.from({ length: 2 }).map((_, i) => (
						<SessionItemSkeleton key={i} />
					))}
				</div>
			</section>

			<div className="h-px bg-border" />

			{/* Logout actions */}
			<section className="flex flex-col gap-6">
				<div className="flex items-center justify-between">
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-9 w-20 rounded-lg" />
				</div>
				<div className="h-px bg-border" />
				<div className="flex items-center justify-between">
					<div className="flex flex-col gap-2">
						<Skeleton className="h-4 w-44" />
						<Skeleton className="h-3 w-64" />
					</div>
					<Skeleton className="h-9 w-24 rounded-lg" />
				</div>
			</section>

			<div className="h-px bg-border" />

			{/* Connected accounts */}
			<section className="flex flex-col gap-6">
				<div className="flex flex-col gap-1.5">
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-3 w-64" />
				</div>
				<div className="flex flex-col gap-3">
					<ProviderItemSkeleton />
				</div>
			</section>
		</div>
	);
}
