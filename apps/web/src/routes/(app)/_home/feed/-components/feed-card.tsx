import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { FeedAsset } from "../-lib/feed-data";

export function FeedCard({
	asset,
	aspect = "aspect-[16/9]"
}: {
	asset: FeedAsset;
	aspect?: string;
}) {
	const [hovered, setHovered] = useState(false);
	const isVideo = asset.type === "video";

	return (
		<Link
			to="/feed/$slug"
			params={{ slug: asset.slug }}
			className="group block"
		>
			<div
				className={`relative ${aspect} overflow-hidden rounded-md bg-muted`}
				onPointerEnter={() => setHovered(true)}
				onPointerLeave={() => setHovered(false)}
			>
				{hovered && isVideo && asset.fileUrl ? (
					<video
						autoPlay
						muted
						loop
						playsInline
						src={asset.fileUrl}
						className="absolute inset-0 h-full w-full object-cover"
					/>
				) : (
					<img
						src={asset.coverThumb}
						alt={asset.title}
						className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
					/>
				)}

				{/* Format + resolution — bottom left */}
				<div className="absolute bottom-2 left-2 flex items-center gap-1">
					<span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-black/60 text-white/80 backdrop-blur-sm">
						{asset.format}
					</span>
					<span className="rounded px-1.5 py-0.5 text-[9px] font-medium bg-black/40 text-white/60 backdrop-blur-sm">
						{asset.resolution}
					</span>
				</div>

				{/* Members badge — top right */}
				{asset.access === "members" && (
					<div className="absolute right-2 top-2">
						<span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-primary text-primary-foreground">
							Members
						</span>
					</div>
				)}
			</div>

			<div className="mt-2.5 px-0.5">
				<h3 className="font-heading font-semibold text-sm leading-snug text-foreground transition-colors group-hover:text-primary line-clamp-1">
					{asset.title}
				</h3>
			</div>
		</Link>
	);
}

export function FeedCardSkeleton() {
	return (
		<div className="block animate-pulse">
			<div className="aspect-[16/9] rounded-md bg-muted" />
			<div className="mt-2.5 px-0.5">
				<div className="h-4 w-3/4 rounded bg-muted" />
			</div>
		</div>
	);
}
