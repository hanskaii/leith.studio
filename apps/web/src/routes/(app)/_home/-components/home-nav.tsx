import { Link } from "@tanstack/react-router";
import { authClient } from "@/auth/client";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/routes/-components/layouts/theme-toggle";
import { ASSETS } from "../-lib/home-data";

const ANNOUNCEMENT = "All Access: lifetime price ending soon. Lock it in.";
const ACCESS_URL = "/activate";

export function HomeNav() {
	const { data: session } = authClient.useSession();
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 8);
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<div className="fixed inset-x-0 top-0 z-50">
			{/* Announcement bar */}
			<div className="w-full bg-primary py-2 px-4 text-center">
				<a
					href={ACCESS_URL}
					className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground hover:opacity-80 transition-opacity"
				>
					{ANNOUNCEMENT}
				</a>
			</div>

			{/* Nav */}
			<header
				className={`relative flex h-20 items-center justify-between px-5 sm:px-8 transition-colors duration-200 ${
					scrolled
						? "border-b border-border/50 bg-background/90 backdrop-blur-md"
						: "bg-transparent"
				}`}
			>
				{/* Inner constraint */}
				<div className="w-full max-w-[1280px] mx-auto flex items-center justify-between">
					{/* Logo */}
					<Link
						to="/"
						className="font-heading text-xl font-black tracking-tight text-foreground hover:opacity-70 transition-opacity"
					>
						leith
					</Link>

					{/* Center nav */}
					<nav className="hidden items-center gap-7 sm:flex absolute left-1/2 -translate-x-1/2">
						<a
							href="#assets"
							className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground transition-colors"
						>
							Assets
							<span className="tabular-nums text-[10px] font-semibold text-muted-foreground/50">
								{ASSETS.length}
							</span>
						</a>
						<a
							href="#access"
							className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground transition-colors"
						>
							All Access
						</a>
						<a
							href="#faq"
							className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground transition-colors"
						>
							FAQ
						</a>
					</nav>

					{/* Right actions */}
					<div className="flex items-center gap-3">
						{session?.user ? (
							<a
								href="/feed"
								className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground transition-colors"
							>
								Library
							</a>
						) : (
							<Link
								to="/login"
								className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground transition-colors"
							>
								Sign in
							</Link>
						)}
						<ThemeToggle />
						<a
							href={ACCESS_URL}
							className="inline-flex h-9 items-center rounded-[0.375rem] border border-foreground/20 bg-foreground/[0.07] px-5 text-[12px] font-semibold text-foreground transition-colors hover:bg-foreground/15"
						>
							All Access
						</a>
					</div>
				</div>
			</header>
		</div>
	);
}
