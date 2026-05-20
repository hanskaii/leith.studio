import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger
} from "@workspace/ui";
import { FAQ_ITEMS } from "../-lib/home-data";

export function FaqSection() {
	return (
		<section id="faq" className="w-full border-t border-border/40">
			<div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-14 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-20">
				<div>
					<h2 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight leading-[1.06] text-foreground">
						Everything
						<br />
						explained.
					</h2>
					<p className="mt-5 text-sm text-muted-foreground leading-relaxed max-w-[32ch]">
						Five things worth knowing before you buy.
					</p>
				</div>

				<div>
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
				</div>
			</div>
		</section>
	);
}
