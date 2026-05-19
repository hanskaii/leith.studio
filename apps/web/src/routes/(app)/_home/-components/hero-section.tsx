import { motion } from "framer-motion";
import { Button } from "@workspace/ui";
import { ACCESS_URL } from "../-lib/home-data";
import { fadeUp, stagger } from "../-lib/motion-variants";

export function HeroSection() {
	return (
		<section className="w-full max-w-[1280px] mx-auto px-5 sm:px-8 pt-16 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
			<motion.div initial="hidden" animate="visible" variants={stagger}>
				<motion.h1
					variants={fadeUp}
					custom={0}
					className="font-heading font-bold leading-[1.0] tracking-tight"
					style={{ fontSize: "clamp(3rem, 6.5vw, 5.5rem)" }}
				>
					<span className="block text-foreground">
						Dark Cinematic
					</span>
					<span className="block text-foreground/40">by Leith</span>
				</motion.h1>
			</motion.div>

			<motion.div
				initial="hidden"
				animate="visible"
				variants={stagger}
				className="flex flex-col gap-6 lg:pt-2"
			>
				<motion.p
					variants={fadeUp}
					custom={0}
					className="text-base text-muted-foreground leading-relaxed"
				>
					A growing collection of video loops, animated backgrounds,
					and overlays. Dark, precise, built around one aesthetic. One
					all-access purchase unlocks everything, forever.
				</motion.p>

				<motion.div
					variants={fadeUp}
					custom={1}
					className="w-full h-px bg-border/50"
				/>

				<motion.div
					variants={fadeUp}
					custom={2}
					className="flex items-center gap-5"
				>
					<Button size="xl" asChild>
						<a href={ACCESS_URL}>Get All Access</a>
					</Button>
					<p className="text-sm text-muted-foreground leading-snug max-w-[16ch]">
						Early-bird price. Increases with each drop.
					</p>
				</motion.div>
			</motion.div>
		</section>
	);
}
