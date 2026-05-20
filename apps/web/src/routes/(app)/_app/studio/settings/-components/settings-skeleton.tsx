import { Skeleton } from "@workspace/ui";

export function SettingsSkeleton() {
	return (
		<div className="max-w-2xl flex flex-col gap-6">
			{[...Array(4)].map((_, i) => (
				<div key={i} className="flex flex-col gap-2">
					<Skeleton className="h-4 w-32 rounded" />
					<Skeleton className="h-9 w-full rounded" />
				</div>
			))}
		</div>
	);
}
