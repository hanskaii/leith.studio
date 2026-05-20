import { Link } from "@tanstack/react-router";
import { STEPS, ACCESS_URL } from "../-lib/home-data";

export function StepsSection() {
	return (
		<section className="w-full border-t border-border/40">
			<div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-20">
				<h2 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight leading-[1.06] text-foreground mb-16">
					Simple steps,
					<br />
					no friction.
				</h2>

				<div className="flex flex-col">
					{STEPS.map((step) => (
						<div
							key={step.n}
							className="grid grid-cols-[2.5rem_1fr] md:grid-cols-[2.5rem_1fr_1fr] items-baseline gap-x-8 gap-y-1.5 border-t border-border/50 py-7"
						>
							<span className="font-sans font-medium tabular-nums text-[11px] tracking-[0.14em] text-muted-foreground/50 pt-0.5">
								0{step.n}
							</span>
							<p className="font-heading text-xl font-semibold tracking-tight text-foreground">
								{step.title}
							</p>
							<p className="col-start-2 md:col-start-3 text-sm text-muted-foreground leading-relaxed">
								{step.body}
							</p>
						</div>
					))}
					<div className="border-t border-border/50" />
				</div>

				<div className="flex items-center gap-8 mt-12">
					<a
						href={ACCESS_URL}
						className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
					>
						Get All Access →
					</a>
					<Link
						to="/feed"
						search={{ page: 1, type: "all", sort: "newest" }}
						className="text-sm text-muted-foreground hover:text-foreground transition-colors"
					>
						Browse free
					</Link>
				</div>
			</div>
		</section>
	);
}
