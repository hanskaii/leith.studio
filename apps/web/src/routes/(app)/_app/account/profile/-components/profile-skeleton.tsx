import { Skeleton } from "@workspace/ui";

function FieldRowSkeleton() {
	return (
		<div className="flex items-start justify-between gap-4 py-1">
			<div className="flex flex-col gap-2 flex-1">
				<Skeleton className="h-3.5 w-28" />
				<Skeleton className="h-3 w-44" />
			</div>
			<Skeleton className="h-9 w-55 rounded-lg shrink-0" />
		</div>
	);
}

export function ProfileSkeleton() {
	return (
		<div className="flex flex-col gap-10 w-full mt-2 pb-10">
			{/* Appearance */}
			<section className="flex flex-col gap-4 mt-2">
				<div className="flex items-center justify-between">
					<div className="flex flex-col gap-2">
						<Skeleton className="h-3.5 w-24" />
						<Skeleton className="h-3 w-48" />
					</div>
					<Skeleton className="h-9 w-30 rounded-lg" />
				</div>
			</section>

			<div className="h-px bg-border" />

			{/* Avatar + form fields */}
			<div className="flex flex-col gap-4">
				{/* Avatar row */}
				<div className="flex items-center gap-4 mt-2 mb-2">
					<Skeleton className="size-16 rounded-full shrink-0" />
					<div className="flex flex-col gap-2">
						<Skeleton className="h-9 w-28 rounded-lg" />
						<Skeleton className="h-3 w-36" />
					</div>
				</div>

				<div className="h-px bg-border" />
				<FieldRowSkeleton />
				<div className="h-px bg-border" />
				<FieldRowSkeleton />
				<div className="h-px bg-border" />

				{/* Email (disabled) */}
				<div className="flex items-center justify-between gap-4">
					<div className="flex flex-col gap-2 flex-1">
						<Skeleton className="h-3.5 w-16" />
						<Skeleton className="h-3 w-44" />
					</div>
					<Skeleton className="h-9 w-55 rounded-lg opacity-50 shrink-0" />
				</div>

				{/* Save button */}
				<div className="flex justify-end mt-4">
					<Skeleton className="h-9 w-28 rounded-lg" />
				</div>
			</div>

			<div className="h-px bg-border" />

			{/* Danger zone */}
			<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-center justify-between gap-4">
				<div className="flex flex-col gap-2">
					<Skeleton className="h-3.5 w-28" />
					<Skeleton className="h-3 w-64" />
				</div>
				<Skeleton className="h-9 w-32 rounded-lg shrink-0" />
			</div>
		</div>
	);
}
