import { Link } from "@tanstack/react-router";
import { ACCESS_URL } from "../-lib/home-data";

export function FooterSection() {
	return (
		<footer className="w-full border-t border-border/40">
			<div className="max-w-[1280px] mx-auto px-5 sm:px-8 py-7 grid grid-cols-2 sm:grid-cols-4 gap-6">
				<div className="col-span-2 sm:col-span-1 flex flex-col gap-3">
					<span className="font-heading font-black text-2xl tracking-tight text-primary">
						leith
					</span>
					<p className="text-sm text-muted-foreground leading-relaxed max-w-[18ch]">
						Dark cinematic assets for streamers and creators.
					</p>
				</div>
				<div className="flex flex-col gap-2.5">
					<span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground mb-0.5">
						Library
					</span>
					<Link
						to="/feed"
						search={{ page: 1 }}
						className="text-sm text-muted-foreground hover:text-foreground transition-colors"
					>
						Browse
					</Link>
					<a
						href={ACCESS_URL}
						className="text-sm text-muted-foreground hover:text-foreground transition-colors"
					>
						All Access
					</a>
				</div>
				<div className="flex flex-col gap-2.5">
					<span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground mb-0.5">
						Info
					</span>
					<a
						href="/contact"
						className="text-sm text-muted-foreground hover:text-foreground transition-colors"
					>
						Contact
					</a>
					<Link
						to="/legals/privacy-policy"
						className="text-sm text-muted-foreground hover:text-foreground transition-colors"
					>
						Privacy
					</Link>
				</div>
				<div className="flex flex-col gap-2.5">
					<span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground mb-0.5">
						Account
					</span>
					<Link
						to="/login"
						className="text-sm text-muted-foreground hover:text-foreground transition-colors"
					>
						Sign in
					</Link>
					<Link
						to="/activate"
						className="text-sm text-muted-foreground hover:text-foreground transition-colors"
					>
						Activate license
					</Link>
				</div>
			</div>

			<div className="border-t border-border/40 overflow-hidden">
				<p
					className="font-heading font-black leading-[0.85] tracking-tighter text-foreground/[0.05] select-none px-4 pb-2"
					style={{ fontSize: "clamp(5rem, 22vw, 16rem)" }}
				>
					LEITH
				</p>
			</div>

			<div className="border-t border-border/40 px-5 sm:px-8 py-4 max-w-[1280px] mx-auto">
				<p className="text-xs text-muted-foreground">
					© 2025 Leith. All rights reserved.
				</p>
			</div>
		</footer>
	);
}
