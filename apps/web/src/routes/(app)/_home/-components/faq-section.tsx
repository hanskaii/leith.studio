import { motion } from "framer-motion";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger
} from "@workspace/ui";
import { FAQ_ITEMS } from "../-lib/home-data";
import { fadeUp, stagger } from "../-lib/motion-variants";

export function FaqSection() {
	return (
		<section id="faq" className="w-full border-t border-border/40">
			<motion.div
				initial="hidden"
				whileInView="visible"
				viewport={{ once: true, margin: "-60px" }}
				variants={stagger}
				className="max-w-[1280px] mx-auto px-5 sm:px-8 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24"
			>
				<div>
					<motion.h2
						variants={fadeUp}
						custom={1}
						className="font-heading text-4xl sm:text-5xl font-bold tracking-tight leading-[1.06] text-foreground"
					>
						Everything
						<br />
						explained.
					</motion.h2>
					<motion.p
						variants={fadeUp}
						custom={2}
						className="mt-5 text-sm text-muted-foreground leading-relaxed max-w-[32ch]"
					>
						Five things worth knowing before you buy.
					</motion.p>
				</div>

				<motion.div variants={fadeUp} custom={1}>
					<Accordion type="single" collapsible className="w-full">
						{FAQ_ITEMS.map((item, i) => (
							<AccordionItem key={i} value={`item-${i}`}>
								<AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline hover:text-foreground/70 transition-colors text-left">
									{item.q}
								</AccordionTrigger>
								<AccordionContent className="text-sm text-muted-foreground leading-relaxed">
									{item.a}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</motion.div>
			</motion.div>
		</section>
	);
}
