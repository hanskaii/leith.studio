import { HugeiconsIcon } from "@hugeicons/react";
import { ChartIncreaseIcon } from "@hugeicons/core-free-icons";

export function CreatorOverviewPlaceholder() {
	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center px-6">
			<div className="size-12 rounded-full bg-muted/40 flex items-center justify-center">
				<HugeiconsIcon
					icon={ChartIncreaseIcon}
					className="size-6 text-muted-foreground"
					strokeWidth={1.5}
				/>
			</div>
			<h1 className="text-xl font-semibold tracking-tight">
				Overview coming soon
			</h1>
			<p className="text-sm text-muted-foreground max-w-sm">
				Your creator dashboard will show post performance, downloads,
				and audience reach here. We're still building it.
			</p>
		</div>
	);
}
