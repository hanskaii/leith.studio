import { Button } from "@workspace/ui";
import { Link } from "@tanstack/react-router";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useModal } from "@/routes/-components/providers/modal-provider";
import { ACCESS_URL } from "../-lib/home-data";

export function HeroSection() {
	const { openSearch } = useModal();

	return (
		<section className="w-full pt-10 pb-14">
			<div className="max-w-2xl mx-auto px-5 sm:px-8 flex flex-col items-center text-center gap-5">
				<h1
					className="font-heading font-bold leading-[1.05] tracking-tight"
					style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
				>
					Dark cinematic assets,{" "}
					<span className="text-primary">yours forever.</span>
				</h1>

				<p className="text-base text-muted-foreground leading-relaxed max-w-[50ch]">
					Video loops, animated overlays, and still backgrounds. Built
					for OBS, streams, and productions. No watermarks, no
					subscriptions.
				</p>

				<div className="flex flex-wrap items-center justify-center gap-3 pt-1">
					<Button size="xl" asChild>
						<a href={ACCESS_URL}>Get All Access · $49</a>
					</Button>
					<Button size="xl" variant="outline" asChild>
						<Link to="/feed" search={{ page: 1, type: "all", sort: "newest" }}>
							Browse free →
						</Link>
					</Button>
				</div>

				<Link
					to="/feed"
					search={{ page: 1, type: "all", sort: "newest" }}
					className="text-sm text-muted-foreground hover:text-foreground transition-colors"
				>
					Or browse free, no account needed →
				</Link>

				<button
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
				</button>
			</div>
		</section>
	);
}
