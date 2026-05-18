import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { authClient } from "@/auth/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { postStatsQueryOptions } from "@/routes/-fn/posts";

export const Route = createFileRoute("/(app)/_home/")({
	component: LandingPage
});

const CHECKOUT_URL = import.meta.env.VITE_DODO_CHECKOUT_URL as string;

const PREVIEW_POSTS = [
	{
		title: "ControlNet Depth Maps: Precise Spatial Control",
		tags: ["controlnet", "depth"],
		cover: null
	},
	{
		title: "IP-Adapter + Style Reference: Locking Character DNA",
		tags: ["ip-adapter", "style"],
		cover: null
	},
	{
		title: "Negative Prompts That Actually Work",
		tags: ["prompting", "technique"],
		cover: null
	}
];

const stagger = {
	hidden: {},
	show: { transition: { staggerChildren: 0.08 } }
};
const fadeUp = {
	hidden: { opacity: 0, y: 18 },
	show: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.45, ease: "easeOut" as const }
	}
};

function StatsRow() {
	const { data: stats } = useSuspenseQuery(postStatsQueryOptions());
	if (!stats?.postCount) return null;
	return (
		<motion.p
			variants={fadeUp}
			className="text-sm"
			style={{ color: "oklch(0.50 0.010 60)" }}
		>
			{stats.postCount} breakdown{stats.postCount !== 1 ? "s" : ""} in the
			archive
		</motion.p>
	);
}

function LandingPage() {
	const { data: session } = authClient.useSession();
	const isMember =
		session?.user?.role === "member" || session?.user?.role === "admin";

	return (
		<div
			className="min-h-[100dvh] flex flex-col"
			style={{
				background: "oklch(0.97 0.008 80)",
				color: "oklch(0.15 0.008 60)"
			}}
		>
			{/* Nav */}
			<nav
				className="flex items-center justify-between px-8 py-5 border-b"
				style={{ borderColor: "oklch(0.88 0.008 80)" }}
			>
				<span
					className="text-lg tracking-tight"
					style={{
						fontFamily: "var(--font-heading)",
						fontWeight: 600,
						letterSpacing: "-0.02em"
					}}
				>
					leith
				</span>
				<div className="flex items-center gap-4">
					{session ? (
						isMember ? (
							<Link
								to="/feed"
								className="text-sm px-4 py-2 rounded-md transition-colors"
								style={{
									background: "oklch(0.62 0.14 47)",
									color: "oklch(0.97 0.008 80)",
									fontFamily: "var(--font-sans)",
									fontWeight: 500
								}}
							>
								Go to feed
							</Link>
						) : (
							<Link
								to="/activate"
								className="text-sm px-4 py-2 rounded-md"
								style={{ color: "oklch(0.50 0.010 60)" }}
							>
								Activate key
							</Link>
						)
					) : (
						<Link
							to="/login"
							className="text-sm"
							style={{ color: "oklch(0.50 0.010 60)" }}
						>
							Sign in
						</Link>
					)}
				</div>
			</nav>

			{/* Hero — asymmetric split */}
			<main className="flex-1 grid md:grid-cols-[1fr_1.1fr] gap-0">
				{/* Left */}
				<motion.div
					variants={stagger}
					initial="hidden"
					animate="show"
					className="flex flex-col justify-center px-8 md:px-14 py-20 md:py-0"
				>
					<motion.div
						variants={fadeUp}
						className="inline-flex items-center gap-2 mb-8 px-2.5 py-1 rounded self-start"
						style={{
							background: "oklch(0.94 0.025 55)",
							color: "oklch(0.52 0.14 47)",
							fontSize: "0.6875rem",
							fontWeight: 500,
							letterSpacing: "0.01em",
							fontFamily: "var(--font-sans)"
						}}
					>
						by @Superoutman
					</motion.div>

					<motion.h1
						variants={fadeUp}
						style={{
							fontFamily: "var(--font-heading)",
							fontWeight: 600,
							fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
							lineHeight: 0.95,
							letterSpacing: "-0.03em",
							maxWidth: "14ch"
						}}
					>
						AI image breakdowns that actually teach you something.
					</motion.h1>

					<motion.p
						variants={fadeUp}
						className="mt-6 text-base leading-relaxed"
						style={{
							color: "oklch(0.50 0.010 60)",
							fontFamily: "var(--font-sans)",
							maxWidth: "40ch"
						}}
					>
						Technique notes, process walkthroughs, and the specific
						settings that make images work. One license key,
						permanent access.
					</motion.p>

					<motion.div
						variants={fadeUp}
						className="mt-10 flex items-center gap-4"
					>
						{isMember ? (
							<Link
								to="/feed"
								className="inline-flex items-center px-5 py-2.5 rounded-md text-sm font-medium transition-all hover:-translate-y-px"
								style={{
									background: "oklch(0.62 0.14 47)",
									color: "oklch(0.97 0.008 80)",
									fontFamily: "var(--font-sans)"
								}}
							>
								Go to feed &rarr;
							</Link>
						) : (
							<a
								href={CHECKOUT_URL || "/activate"}
								className="inline-flex items-center px-5 py-2.5 rounded-md text-sm font-medium transition-all hover:-translate-y-px"
								style={{
									background: "oklch(0.62 0.14 47)",
									color: "oklch(0.97 0.008 80)",
									fontFamily: "var(--font-sans)"
								}}
							>
								Get access &rarr;
							</a>
						)}
					</motion.div>

					<Suspense fallback={null}>
						<motion.div variants={fadeUp} className="mt-8">
							<StatsRow />
						</motion.div>
					</Suspense>
				</motion.div>

				{/* Right — locked post preview grid */}
				<motion.div
					variants={stagger}
					initial="hidden"
					animate="show"
					className="flex flex-col justify-center gap-3 px-8 md:px-10 py-16 md:py-20"
					style={{ background: "oklch(0.94 0.025 55)" }}
				>
					<motion.p
						variants={fadeUp}
						className="text-xs font-medium mb-1"
						style={{
							color: "oklch(0.50 0.010 60)",
							fontFamily: "var(--font-sans)",
							letterSpacing: "0.01em"
						}}
					>
						Recent breakdowns
					</motion.p>

					{PREVIEW_POSTS.map((post, i) => (
						<motion.div
							key={i}
							variants={fadeUp}
							className="relative overflow-hidden rounded-md border"
							style={{ borderColor: "oklch(0.88 0.008 80)" }}
						>
							{/* Blurred cover placeholder */}
							<div
								className="w-full"
								style={{
									aspectRatio: "16/9",
									background: `oklch(${0.75 - i * 0.04} 0.030 55)`,
									filter: "blur(0px)",
									position: "relative"
								}}
							>
								{/* Lock overlay */}
								<div
									className="absolute inset-0 flex items-center justify-center"
									style={{
										backdropFilter: "blur(8px)",
										background:
											"oklch(0.15 0.008 60 / 0.08)"
									}}
								>
									<div
										className="flex items-center justify-center w-10 h-10 rounded-full"
										style={{
											background: "oklch(0.94 0.025 55)"
										}}
									>
										<svg
											width="16"
											height="16"
											viewBox="0 0 16 16"
											fill="none"
										>
											<rect
												x="3"
												y="7"
												width="10"
												height="8"
												rx="1.5"
												stroke="oklch(0.50 0.010 60)"
												strokeWidth="1.5"
											/>
											<path
												d="M5 7V5a3 3 0 0 1 6 0v2"
												stroke="oklch(0.50 0.010 60)"
												strokeWidth="1.5"
												strokeLinecap="round"
											/>
										</svg>
									</div>
								</div>
							</div>

							{/* Footer */}
							<div
								className="px-4 py-3 flex items-start justify-between gap-3"
								style={{ background: "oklch(0.97 0.008 80)" }}
							>
								<p
									className="text-sm font-medium leading-tight"
									style={{
										fontFamily: "var(--font-heading)",
										letterSpacing: "-0.01em",
										color: "oklch(0.15 0.008 60)"
									}}
								>
									{post.title}
								</p>
								<div className="flex gap-1 shrink-0 mt-0.5">
									{post.tags.map((tag) => (
										<span
											key={tag}
											className="rounded px-1.5 py-0.5"
											style={{
												background:
													"oklch(0.94 0.025 55)",
												color: "oklch(0.52 0.14 47)",
												fontSize: "0.6875rem",
												fontFamily: "var(--font-sans)",
												fontWeight: 500
											}}
										>
											{tag}
										</span>
									))}
								</div>
							</div>
						</motion.div>
					))}

					<motion.p
						variants={fadeUp}
						className="text-xs mt-2 text-center"
						style={{
							color: "oklch(0.62 0.14 47)",
							fontFamily: "var(--font-sans)"
						}}
					>
						Members only &mdash; one-time access
					</motion.p>
				</motion.div>
			</main>

			{/* Footer */}
			<footer
				className="px-8 py-6 border-t flex items-center justify-between"
				style={{ borderColor: "oklch(0.88 0.008 80)" }}
			>
				<span
					className="text-xs"
					style={{
						color: "oklch(0.50 0.010 60)",
						fontFamily: "var(--font-sans)"
					}}
				>
					leith &copy; 2026
				</span>
				<Link
					to="/login"
					className="text-xs"
					style={{
						color: "oklch(0.50 0.010 60)",
						fontFamily: "var(--font-sans)"
					}}
				>
					Sign in
				</Link>
			</footer>
		</div>
	);
}
