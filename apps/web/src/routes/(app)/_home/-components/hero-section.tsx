import { motion } from "framer-motion";
import { Button } from "@workspace/ui";
import { Link } from "@tanstack/react-router";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useModal } from "@/routes/-components/providers/modal-provider";
import { ACCESS_URL } from "../-lib/home-data";
import { fadeUp, stagger } from "../-lib/motion-variants";

export function HeroSection() {
	const { openSearch } = useModal();

	return (
		<section className="w-full pt-10 pb-14">
			<motion.div
				initial="hidden"
				animate="visible"
				variants={stagger}
				className="max-w-2xl mx-auto px-5 sm:px-8 flex flex-col items-center text-center gap-5"
			>
				{/* Heading */}
				<motion.h1
					variants={fadeUp}
					custom={0}
					className="font-heading font-bold leading-[1.05] tracking-tight"
					style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
				>
					Dark cinematic assets,{" "}
					<span className="text-primary">yours forever.</span>
				</motion.h1>

				{/* Subtext */}
				<motion.p
					variants={fadeUp}
					custom={1}
					className="text-base text-muted-foreground leading-relaxed max-w-[50ch]"
				>
					Video loops, animated overlays, and still backgrounds. Built
					for OBS, streams, and productions. No watermarks, no
					subscriptions.
				</motion.p>

				{/* CTAs */}
				<motion.div
					variants={fadeUp}
					custom={2}
					className="flex flex-wrap items-center justify-center gap-3 pt-1"
				>
					<Button size="xl" asChild>
						<a href={ACCESS_URL}>Get All Access · $49</a>
					</Button>
					<Button size="xl" variant="outline" asChild>
						<Link to="/feed" search={{ page: 1 }}>
							Browse free →
						</Link>
					</Button>
				</motion.div>

				{/* Ghost link */}
				<motion.div variants={fadeUp} custom={3}>
					<Link
						to="/feed"
						search={{ page: 1 }}
						className="text-sm text-muted-foreground hover:text-foreground transition-colors"
					>
						Or browse free, no account needed →
					</Link>
				</motion.div>

				{/* Search trigger — opens CommandDialog */}
				<motion.button
					variants={fadeUp}
					custom={4}
					type="button"
					onClick={openSearch}
					className="w-full max-w-md mt-2 flex items-center gap-2 rounded-md border border-border bg-card px-3 h-10 text-left transition-colors hover:border-foreground/25 hover:bg-muted/50"
				>
					<HugeiconsIcon
						icon={Search01Icon}
						className="w-4 h-4 text-muted-foreground flex-none"
					/>
					<span className="flex-1 text-sm text-muted-foreground">
						Search by vibe... loop, overlay, transition
					</span>
					<kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border/50 bg-muted px-1.5 py-0.5 text-[10px] font-sans text-muted-foreground/60 select-none flex-none">
						⌘K
					</kbd>
				</motion.button>
			</motion.div>
		</section>
	);
}
