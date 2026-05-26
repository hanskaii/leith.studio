import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { StudioGrid } from "./-components/studio-grid";
import { StudioGridSkeleton } from "./-components/studio-grid-skeleton";
import { UploadZone } from "./-components/upload-zone";

const studioSearchSchema = z.object({
	selected: z.string().optional()
});

export const Route = createFileRoute("/(app)/_app/studio/")({
	validateSearch: (search) => studioSearchSchema.parse(search),
	component: StudioPage
});

function StudioPage() {
	const { selected } = Route.useSearch();

	return (
		<div className="flex flex-col gap-6 px-6 py-8">
			<header>
				<h1 className="text-2xl font-bold tracking-tight">Studio</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Upload assets, let AI fill the metadata, publish when ready.
				</p>
			</header>

			<UploadZone />

			<Suspense fallback={<StudioGridSkeleton />}>
				<StudioGrid selectedId={selected} />
			</Suspense>
		</div>
	);
}
