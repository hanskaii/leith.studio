import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ThemeToggle } from "@/routes/-components/layouts/theme-toggle";
import { LoginForm } from "./-components/login-form";

const loginSearchSchema = z.object({
	redirect: z.string().optional()
});

export const Route = createFileRoute("/(app)/_auth/login")({
	validateSearch: loginSearchSchema,
	component: LoginPage,
	head: () => ({
		meta: [
			{ title: "Sign in — Leith" },
			{
				name: "description",
				content: "Sign in to your Leith account."
			}
		]
	})
});

// Hardcoded dark panel bg — does not flip with theme
const PANEL_BG =
	"https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=1400&q=70&auto=format&fit=crop";

function LoginPage() {
	const search = useSearch({ from: "/(app)/_auth/login" });

	return (
		<div className="flex min-h-[100dvh]">
			{/* ── Left: brand panel (desktop only) ── */}
			<div className="relative hidden lg:flex lg:w-[42%] flex-col justify-between overflow-hidden bg-background p-10 border-r border-border/40">
				{/* Cinematic bg image */}
				<div
					className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.15]"
					style={{ backgroundImage: `url(${PANEL_BG})` }}
					aria-hidden
				/>
				{/* Vignette — uses bg-background so it adapts to theme */}
				<div
					className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60"
					aria-hidden
				/>

				{/* Logo */}
				<div className="relative">
					<Link
						to="/"
						className="font-heading text-xl font-black tracking-tight text-foreground opacity-90 transition-opacity hover:opacity-60"
					>
						leith
					</Link>
				</div>

				{/* Tagline — vertically centered */}
				<div className="relative">
					<p
						className="font-heading font-bold leading-[1.05] tracking-[-0.025em] text-foreground"
						style={{ fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)" }}
					>
						Dark cinematic assets,{" "}
						<span className="text-primary">yours forever.</span>
					</p>
					<p className="mt-4 max-w-[34ch] text-sm leading-relaxed text-muted-foreground">
						Video loops, overlays, and backgrounds built for OBS,
						streams, and productions.
					</p>
				</div>

				{/* Bottom wordmark */}
				<div className="relative">
					<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">
						Leith · Dark Cinematic Assets
					</p>
				</div>
			</div>

			{/* ── Right: form panel ── */}
			<div className="flex flex-1 flex-col">
				{/* Top bar */}
				<header className="flex items-center justify-between px-6 py-5 sm:px-10">
					<Link
						to="/"
						className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						<HugeiconsIcon
							icon={ArrowLeft01Icon}
							className="h-4 w-4"
							strokeWidth={2}
						/>
						Back
					</Link>

					{/* Logo — mobile only */}
					<Link
						to="/"
						className="font-heading text-lg font-black tracking-tight text-foreground transition-opacity hover:opacity-70 lg:hidden"
					>
						leith
					</Link>

					<ThemeToggle />
				</header>

				{/* Form — centered in remaining space */}
				<div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
					<div className="w-full max-w-sm">
						<div className="mb-8">
							<h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
								Sign in
							</h1>
							<p className="mt-2 text-sm text-muted-foreground">
								Enter your email to continue.
							</p>
						</div>
						<LoginForm redirectTo={search.redirect} />
					</div>
				</div>
			</div>
		</div>
	);
}
