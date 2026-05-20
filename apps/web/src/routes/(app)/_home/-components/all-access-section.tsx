import { Button } from "@workspace/ui";
import {
	ArrowRightIcon,
	CheckmarkCircleIcon
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ACCESS_URL } from "../-lib/home-data";

const INCLUSIONS = [
	"140+ assets, immediately",
	"Every future release included",
	"MP4, WEBM, PNG: all formats",
	"Commercial license"
] as const;

export function AllAccessSection() {
	return (
		<section id="access" className="w-full border-t border-border/40">
			<div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-14 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-20 items-start">
				<div>
					<h2 className="font-heading text-5xl lg:text-[4rem] font-bold tracking-tight leading-[1.04] text-foreground">
						All Access.
						<br />
						The full Leith
						<br />
						library. Forever.
					</h2>
				</div>

				<div className="flex flex-col gap-5 lg:pt-10">
					<p className="text-muted-foreground text-base leading-relaxed max-w-[40ch]">
						Launch price{" "}
						<span className="font-semibold text-primary">
							$49 lifetime.
						</span>{" "}
						Regular price{" "}
						<span className="line-through text-muted-foreground/60">
							$99
						</span>
						. Price increments with each new drop.
					</p>

					<ul className="flex flex-col gap-2.5">
						{INCLUSIONS.map((item) => (
							<li
								key={item}
								className="flex items-center gap-2.5 text-sm text-muted-foreground"
							>
								<HugeiconsIcon
									icon={CheckmarkCircleIcon}
									className="w-4 h-4 text-primary flex-none"
								/>
								{item}
							</li>
						))}
					</ul>

					<div className="pt-2">
						<Button size="xl" asChild className="w-fit">
							<a href={ACCESS_URL}>
								Get All Access · $49
								<HugeiconsIcon
									icon={ArrowRightIcon}
									className="w-4 h-4"
								/>
							</a>
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
}
