import { motion } from "framer-motion";
import { ASSETS, ACCESS_URL } from "../-lib/home-data";
import { fadeUp, stagger } from "../-lib/motion-variants";
import { AssetCard } from "./asset-card";

export function AssetGrid() {
	return (
		<section
			id="assets"
			className="w-full max-w-[1280px] mx-auto px-5 sm:px-8 py-16"
		>
			<motion.div
				initial="hidden"
				whileInView="visible"
				viewport={{ once: true, margin: "-60px" }}
				variants={stagger}
			>
				<motion.div
					variants={fadeUp}
					className="flex items-end justify-between mb-10"
				>
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
				</motion.div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					{ASSETS.map((asset, i) => (
						<motion.div key={asset.id} variants={fadeUp} custom={i}>
							<AssetCard asset={asset} />
						</motion.div>
					))}
				</div>
			</motion.div>
		</section>
	);
}
