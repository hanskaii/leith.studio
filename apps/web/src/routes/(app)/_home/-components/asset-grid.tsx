import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ACCESS_URL } from "../-lib/home-data";
import { FeedCard } from "../feed/-components/feed-card";
import { postsQueryOptions, toFeedAsset } from "@/routes/-fn/posts";

function AssetGridSkeleton() {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
			{Array.from({ length: 8 }).map((_, i) => (
				<div
					key={i}
					className="aspect-[16/10] rounded-lg bg-muted animate-pulse"
				/>
			))}
		</div>
	);
}

function AssetGridItems() {
	const { data } = useSuspenseQuery(postsQueryOptions(1));
	const assets = (data?.items ?? []).map(toFeedAsset);

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
			{assets.map((asset) => (
				<FeedCard key={asset.id} asset={asset} />
			))}
		</div>
	);
}

export function AssetGrid() {
	return (
		<section
			id="assets"
			className="w-full max-w-[1280px] mx-auto px-5 sm:px-8 py-10"
		>
			<div className="flex items-end justify-between mb-10">
				<div>
					<p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
						The library
					</p>
					<h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
						Leith assets
					</h2>
				</div>
				<a
					href={ACCESS_URL}
					className="text-sm text-muted-foreground hover:text-foreground transition-colors"
				>
					All Access →
				</a>
			</div>

			<Suspense fallback={<AssetGridSkeleton />}>
				<AssetGridItems />
			</Suspense>
		</section>
	);
}
