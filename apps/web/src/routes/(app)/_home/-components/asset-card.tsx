import { Link } from "@tanstack/react-router";
import { Badge } from "@workspace/ui";
import type { Asset } from "../-lib/home-data";

export function AssetCard({ asset }: { asset: Asset }) {
	return (
		<Link
			to="/feed/$slug"
			params={{ slug: asset.slug }}
			className="group relative block overflow-hidden rounded-lg border border-border/50 bg-card"
		>
			<div className="relative overflow-hidden bg-muted aspect-[14/9]">
				<img
					src={asset.thumb}
					alt={asset.title}
					className="w-full h-full object-cover brightness-75 transition-all duration-500 ease-out group-hover:brightness-60 group-hover:scale-[1.03]"
					loading="lazy"
				/>

				{/* Format badge — shifts up on hover to clear overlay */}
				<div className="absolute bottom-3 left-3 transition-all duration-300 ease-out group-hover:bottom-[4.5rem]">
					<Badge
						variant="outline"
						className="font-sans font-semibold text-[10px] uppercase tracking-widest bg-background/60 backdrop-blur-sm border-border/40 text-muted-foreground"
					>
						{asset.format}
					</Badge>
				</div>

				{asset.isNew && (
					<div className="absolute top-3 right-3">
						<Badge
							variant="default"
							className="text-[10px] uppercase tracking-wider"
						>
							New
						</Badge>
					</div>
				)}

				{/* Hover overlay — slides up from bottom */}
				<div className="absolute inset-x-0 bottom-0 translate-y-full opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
					<div className="bg-gradient-to-t from-black/65 to-transparent px-3 pt-8 pb-3">
						<p className="text-sm font-medium text-white leading-snug truncate">
							{asset.title}
						</p>
						<p className="text-[10px] font-sans font-medium uppercase tracking-wider text-white/55 mt-0.5">
							{asset.tag}
						</p>
					</div>
				</div>
			</div>
		</Link>
	);
}
