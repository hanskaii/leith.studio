import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { authClient } from "@/auth/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { postStatsQueryOptions, postsQueryOptions } from "@/routes/-fn/posts";
import type { PostsData } from "@/routes/-fn/posts";

export const Route = createFileRoute("/(app)/_home/")({
	component: LandingPage
});

const CHECKOUT_URL = import.meta.env.VITE_DODO_CHECKOUT_URL as string;

type Post = PostsData["items"][number];

// ─── Motion variants ──────────────────────────────────────────────────────────

const fadeUp = {
	hidden: { opacity: 0, y: 14 },
	show: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.48, ease: [0.16, 1, 0.3, 1] as const }
	}
};

const stagger = {
	hidden: {},
	show: { transition: { staggerChildren: 0.065 } }
};

const AVATAR_COLORS = [
	"oklch(0.70 0.06 50)",
	"oklch(0.65 0.08 58)",
	"oklch(0.73 0.05 55)",
	"oklch(0.67 0.09 46)"
];

// ─── Icons ────────────────────────────────────────────────────────────────────

function LockIcon() {
	return (
		<svg
			width="13"
			height="13"
			viewBox="0 0 16 16"
			fill="none"
			aria-hidden="true"
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
	);
}

// ─── PostPreviewCard ──────────────────────────────────────────────────────────

function PostPreviewCard({
	post,
	isLocked,
	accessUrl
}: {
	post: Post;
	isLocked: boolean;
	accessUrl: string;
}) {
	const coverSrc = (post as any).coverThumb ?? post.coverImage ?? null;
	const format = (post as any).format as string | undefined;
	const refCode = `@${post.slug.slice(0, 8)}`;

	const cardInner = (
		<motion.div
			variants={fadeUp}
			className="rounded-md border overflow-hidden"
			style={{ borderColor: "oklch(0.88 0.008 80)" }}
		>
			{/* Thumbnail */}
			<div
				className="relative overflow-hidden"
				style={{
					aspectRatio: "14/9",
					background: coverSrc ? undefined : "oklch(0.92 0.010 58)"
				}}
			>
				{coverSrc && (
					<img
						src={coverSrc}
						alt={post.title}
						className="w-full h-full object-cover"
					/>
				)}
				{isLocked && (
					<div
						className="absolute inset-0 flex items-center justify-center"
						style={{
							backdropFilter: "blur(8px)",
							background: "oklch(0.15 0.008 60 / 0.06)"
						}}
					>
						<div
							className="flex items-center justify-center w-8 h-8 rounded-full"
							style={{
								background: "oklch(0.97 0.008 80 / 0.88)"
							}}
						>
							<LockIcon />
						</div>
					</div>
				)}
			</div>

			{/* Card body */}
			<div
				className="px-2.5 py-2"
				style={{ background: "oklch(0.97 0.008 80)" }}
			>
				<p
					className="text-xs leading-snug mb-1"
					style={{
						fontFamily: "var(--font-heading)",
						fontWeight: 500,
						letterSpacing: "-0.01em",
						color: "oklch(0.22 0.008 60)"
					}}
				>
					{post.title}
				</p>
				{format && (
					<span
						style={{
							display: "inline-block",
							background: "oklch(0.62 0.14 47 / 0.10)",
							color: "oklch(0.52 0.14 47)",
							fontSize: "0.5rem",
							fontFamily: "var(--font-sans)",
							fontWeight: 600,
							letterSpacing: "0.07em",
							textTransform: "uppercase",
							padding: "1px 5px",
							borderRadius: "3px",
							marginBottom: "3px"
						}}
					>
						{format}
					</span>
				)}
				<p
					style={{
						fontFamily: "ui-monospace, monospace",
						fontSize: "0.5625rem",
						color: "oklch(0.65 0.010 60)",
						letterSpacing: "0.02em"
					}}
				>
					{refCode}
				</p>
			</div>
		</motion.div>
	);

	if (isLocked) {
		return (
			<a href={accessUrl} className="block">
				{cardInner}
			</a>
		);
	}

	return (
		<Link to="/feed/$slug" params={{ slug: post.slug }} className="block">
			{cardInner}
		</Link>
	);
}

// ─── Section skeleton ─────────────────────────────────────────────────────────

function SectionSkeleton() {
	return (
		<div className="grid grid-cols-3 gap-2">
			{Array.from({ length: 6 }).map((_, i) => (
				<div
					key={i}
					className="rounded-md border overflow-hidden animate-pulse"
					style={{ borderColor: "oklch(0.88 0.008 80)" }}
				>
					<div
						style={{
							aspectRatio: "14/9",
							background: "oklch(0.92 0.006 80)"
						}}
					/>
					<div className="px-2.5 py-2 flex flex-col gap-1.5">
						<div
							className="h-2.5 rounded"
							style={{
								background: "oklch(0.92 0.006 80)",
								width: "75%"
							}}
						/>
						<div
							className="h-2 rounded"
							style={{
								background: "oklch(0.92 0.006 80)",
								width: "40%"
							}}
						/>
					</div>
				</div>
			))}
		</div>
	);
}

// ─── SectionPosts (fetches + renders grid + footer) ───────────────────────────

function SectionPosts({
	tag,
	isMember,
	accessUrl,
	formatLabel
}: {
	tag: string;
	isMember: boolean;
	accessUrl: string;
	formatLabel: string;
}) {
	const { data } = useSuspenseQuery(postsQueryOptions(1, tag));
	const items = data?.items?.slice(0, 6) ?? [];

	if (!items.length) return null;

	return (
		<>
			<motion.div
				variants={stagger}
				initial="hidden"
				whileInView="show"
				viewport={{ once: true, margin: "-40px" }}
				className="grid grid-cols-3 gap-2"
			>
				{items.map((post) => (
					<PostPreviewCard
						key={post.id}
						post={post}
						isLocked={
							(post as any).access === "premium" && !isMember
						}
						accessUrl={accessUrl}
					/>
				))}
			</motion.div>
			<div
				className="flex items-center justify-between mt-3.5 pt-3"
				style={{ borderTop: "1px solid oklch(0.88 0.008 80)" }}
			>
				<span
					style={{
						color: "oklch(0.60 0.010 60)",
						fontFamily: "var(--font-sans)",
						fontSize: "0.6875rem"
					}}
				>
					{formatLabel}
				</span>
				<a
					href={accessUrl}
					style={{
						color: "oklch(0.62 0.14 47)",
						fontFamily: "var(--font-sans)",
						fontSize: "0.6875rem",
						fontWeight: 500
					}}
				>
					{data.total} Breakdowns
				</a>
			</div>
		</>
	);
}

// ─── ContentSection ───────────────────────────────────────────────────────────

function ContentSection({
	id,
	heading,
	tag,
	isMember,
	accessUrl,
	formatLabel
}: {
	id: string;
	heading: string;
	tag: string;
	isMember: boolean;
	accessUrl: string;
	formatLabel: string;
}) {
	return (
		<section id={id} className="px-5 pt-5 pb-4">
			<div className="flex items-center justify-between mb-4">
				<h2
					style={{
						fontFamily: "var(--font-heading)",
						fontWeight: 600,
						fontSize: "0.9375rem",
						letterSpacing: "-0.015em",
						color: "oklch(0.15 0.008 60)"
					}}
				>
					{heading}
				</h2>
				<a
					href={accessUrl}
					style={{
						color: "oklch(0.62 0.14 47)",
						fontFamily: "var(--font-sans)",
						fontSize: "0.6875rem"
					}}
				>
					all works ›
				</a>
			</div>
			<Suspense fallback={<SectionSkeleton />}>
				<SectionPosts
					tag={tag}
					isMember={isMember}
					accessUrl={accessUrl}
					formatLabel={formatLabel}
				/>
			</Suspense>
		</section>
	);
}

// ─── TrustedCount ─────────────────────────────────────────────────────────────

function TrustedCount() {
	const { data: stats } = useSuspenseQuery({
		...postStatsQueryOptions(),
		placeholderData: { postCount: 0 }
	});
	const count = stats?.postCount ? Math.max(200, stats.postCount * 5) : 200;
	return <>Trusted by {count}+ designers</>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function LandingPage() {
	const { data: session } = authClient.useSession();
	const isMember =
		session?.user?.role === "member" || session?.user?.role === "admin";
	const accessUrl = CHECKOUT_URL || "/activate";

	return (
		<div
			className="min-h-[100dvh] flex flex-col"
			style={{
				background: "oklch(0.97 0.008 80)",
				color: "oklch(0.15 0.008 60)"
			}}
		>
			{/* ── Announcement bar ── */}
			<div
				className="flex items-center justify-center gap-2 px-4 py-2 text-center"
				style={{
					background: "oklch(0.94 0.025 55)",
					fontFamily: "var(--font-sans)",
					fontSize: "0.6875rem",
					fontWeight: 500,
					color: "oklch(0.52 0.14 47)",
					letterSpacing: "0.01em"
				}}
			>
				<span aria-hidden="true">🚀</span>
				<span>
					leith is upgraded — re-activate with your license key.
				</span>
			</div>

			{/* ── Nav ── */}
			<nav
				className="sticky top-0 z-40 flex items-center justify-between px-8 py-3.5 border-b"
				style={{
					borderColor: "oklch(0.88 0.008 80)",
					background: "oklch(0.97 0.008 80 / 0.94)",
					backdropFilter: "blur(12px)"
				}}
			>
				<div className="flex items-center gap-6">
					<span
						style={{
							fontFamily: "var(--font-heading)",
							fontWeight: 700,
							fontSize: "1rem",
							letterSpacing: "-0.025em",
							color: "oklch(0.15 0.008 60)"
						}}
					>
						leith
					</span>
					<div className="hidden sm:flex items-center gap-0.5">
						{(["Technique", "Workflow"] as const).map((label) => (
							<a
								key={label}
								href={`#${label.toLowerCase()}`}
								className="px-2.5 py-1 rounded transition-colors"
								style={{
									color: "oklch(0.50 0.010 60)",
									fontFamily: "var(--font-sans)",
									fontSize: "0.8125rem"
								}}
							>
								{label}
							</a>
						))}
					</div>
				</div>
				<div className="flex items-center gap-3">
					{session ? (
						isMember ? (
							<Link
								to="/feed"
								search={{ page: 1 }}
								className="text-sm px-4 py-1.5 rounded-md font-medium transition-all hover:-translate-y-px"
								style={{
									background: "oklch(0.62 0.14 47)",
									color: "oklch(0.97 0.008 80)",
									fontFamily: "var(--font-sans)"
								}}
							>
								Open archive
							</Link>
						) : (
							<Link
								to="/activate"
								className="text-sm px-4 py-1.5 rounded-md font-medium"
								style={{
									background: "oklch(0.62 0.14 47)",
									color: "oklch(0.97 0.008 80)",
									fontFamily: "var(--font-sans)"
								}}
							>
								Activate key
							</Link>
						)
					) : (
						<>
							<Link
								to="/login"
								className="text-sm"
								style={{
									color: "oklch(0.50 0.010 60)",
									fontFamily: "var(--font-sans)"
								}}
							>
								Sign in
							</Link>
							<a
								href={accessUrl}
								className="text-sm px-4 py-1.5 rounded-md font-medium transition-all hover:-translate-y-px"
								style={{
									background: "oklch(0.62 0.14 47)",
									color: "oklch(0.97 0.008 80)",
									fontFamily: "var(--font-sans)"
								}}
							>
								Unlimited Access
							</a>
						</>
					)}
				</div>
			</nav>

			{/* ── Hero ── */}
			<motion.section
				variants={stagger}
				initial="hidden"
				animate="show"
				className="flex flex-col items-center text-center px-6 pt-14 pb-10"
			>
				<motion.h1
					variants={fadeUp}
					style={{
						fontFamily: "var(--font-heading)",
						fontWeight: 600,
						fontSize: "clamp(1.625rem, 4.5vw, 2.625rem)",
						lineHeight: 1.08,
						letterSpacing: "-0.03em",
						maxWidth: "22ch",
						color: "oklch(0.15 0.008 60)"
					}}
				>
					Delight in artistry! These{" "}
					<span style={{ color: "oklch(0.62 0.14 47)" }}>
						precise
					</span>{" "}
					and{" "}
					<em
						style={{
							color: "oklch(0.68 0.12 60)",
							fontStyle: "italic"
						}}
					>
						honest
					</em>{" "}
					breakdowns are made for those who appreciate the{" "}
					<span
						style={{
							color: "oklch(0.56 0.11 50)",
							fontWeight: 700
						}}
					>
						actual craft.
					</span>
				</motion.h1>

				<motion.p
					variants={fadeUp}
					className="mt-5 text-sm"
					style={{
						color: "oklch(0.50 0.010 60)",
						fontFamily: "var(--font-sans)"
					}}
				>
					🚀 No vague tips &nbsp;&middot;&nbsp; 👆 Use the technique
					immediately
				</motion.p>

				{/* Avatar stack */}
				<motion.div
					variants={fadeUp}
					className="mt-7 flex flex-col items-center gap-2.5"
				>
					<div className="flex">
						{AVATAR_COLORS.map((bg, i) => (
							<div
								key={i}
								className="w-8 h-8 rounded-full border-2"
								style={{
									background: bg,
									borderColor: "oklch(0.97 0.008 80)",
									marginLeft: i === 0 ? 0 : "-8px"
								}}
							/>
						))}
					</div>
					<p
						className="text-sm"
						style={{
							color: "oklch(0.50 0.010 60)",
							fontFamily: "var(--font-sans)"
						}}
					>
						<Suspense fallback="Trusted by 200+ designers">
							<TrustedCount />
						</Suspense>
					</p>
				</motion.div>
			</motion.section>

			{/* ── Content sections ── */}
			<div className="px-4 sm:px-0 mx-auto w-full max-w-[22rem] sm:max-w-[26rem] md:max-w-[36rem]">
				<div
					className="border rounded-lg overflow-hidden"
					style={{
						borderColor: "oklch(0.88 0.008 80)",
						background: "oklch(0.97 0.008 80)"
					}}
				>
					<ContentSection
						id="technique"
						heading="Technique"
						tag="technique"
						isMember={isMember}
						accessUrl={accessUrl}
						formatLabel="Format: Text breakdown + reference assets"
					/>

					<div
						style={{
							borderTop: "1px solid oklch(0.88 0.008 80)"
						}}
					/>

					<ContentSection
						id="workflow"
						heading="Workflow"
						tag="workflow"
						isMember={isMember}
						accessUrl={accessUrl}
						formatLabel="Format: Full process walkthrough"
					/>
				</div>

				{/* ── CTA ── */}
				<div
					className="mt-4 mb-6 rounded-lg overflow-hidden relative"
					style={{ background: "oklch(0.92 0.032 55)" }}
				>
					<div
						className="absolute pointer-events-none"
						style={{
							left: "-2rem",
							top: "-2rem",
							width: "8rem",
							height: "8rem",
							borderRadius: "9999px",
							background: "oklch(0.62 0.14 47)",
							filter: "blur(40px)",
							opacity: 0.35
						}}
					/>
					<div
						className="absolute pointer-events-none"
						style={{
							right: "-2rem",
							bottom: "-2rem",
							width: "10rem",
							height: "10rem",
							borderRadius: "9999px",
							background: "oklch(0.62 0.14 47)",
							filter: "blur(50px)",
							opacity: 0.22
						}}
					/>
					<div className="relative px-8 py-10 flex flex-col items-center text-center gap-4">
						<h2
							style={{
								fontFamily: "var(--font-heading)",
								fontWeight: 700,
								fontSize: "clamp(1.375rem, 4vw, 1.875rem)",
								letterSpacing: "-0.03em",
								color: "oklch(0.52 0.14 47)"
							}}
						>
							Unlimited Access
						</h2>
						<p
							style={{
								color: "oklch(0.50 0.010 60)",
								fontFamily: "var(--font-sans)",
								fontSize: "0.9375rem"
							}}
						>
							Access all breakdowns with a lifetime license
						</p>
						<div className="flex items-center gap-3 flex-wrap justify-center">
							<a
								href={accessUrl}
								className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md text-sm font-medium transition-all hover:-translate-y-px"
								style={{
									background: "oklch(0.62 0.14 47)",
									color: "oklch(0.97 0.008 80)",
									fontFamily: "var(--font-sans)"
								}}
							>
								🔑 Get Unlimited Access
							</a>
							<Link
								to="/activate"
								className="text-sm font-medium"
								style={{
									color: "oklch(0.52 0.14 47)",
									fontFamily: "var(--font-sans)"
								}}
							>
								Activate License →
							</Link>
						</div>
						<p
							style={{
								color: "oklch(0.62 0.08 55)",
								fontFamily: "var(--font-sans)",
								fontSize: "0.6875rem"
							}}
						>
							Prices will increment with new addition
						</p>
					</div>
				</div>
			</div>

			{/* ── Footer ── */}
			<footer
				className="mt-auto border-t"
				style={{ borderColor: "oklch(0.88 0.008 80)" }}
			>
				<div className="px-4 sm:px-0 mx-auto w-full max-w-[22rem] sm:max-w-[26rem] md:max-w-[36rem] pt-7 pb-6">
					<div className="grid grid-cols-3 gap-4">
						{/* Brand */}
						<div className="flex flex-col gap-3">
							<span
								style={{
									fontFamily: "var(--font-heading)",
									fontWeight: 700,
									fontSize: "0.9375rem",
									letterSpacing: "-0.02em"
								}}
							>
								leith
							</span>
							<p
								style={{
									fontFamily: "var(--font-sans)",
									fontSize: "0.6875rem",
									color: "oklch(0.50 0.010 60)"
								}}
							>
								Exploring AI image craft
							</p>
							<button
								type="button"
								className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs self-start"
								style={{
									borderColor: "oklch(0.88 0.008 80)",
									color: "oklch(0.50 0.010 60)",
									fontFamily: "var(--font-sans)",
									background: "transparent"
								}}
							>
								<span className="font-bold">𝕏</span>
								<span>Share on X</span>
							</button>
						</div>

						{/* Info */}
						<div className="flex flex-col gap-2.5">
							<span
								style={{
									fontFamily: "var(--font-sans)",
									fontSize: "0.6875rem",
									fontWeight: 600,
									color: "oklch(0.50 0.010 60)"
								}}
							>
								Info
							</span>
							<Link
								to="/contact"
								style={{
									fontFamily: "var(--font-sans)",
									fontSize: "0.6875rem",
									color: "oklch(0.50 0.010 60)"
								}}
							>
								About
							</Link>
							<a
								href={accessUrl}
								style={{
									fontFamily: "var(--font-sans)",
									fontSize: "0.6875rem",
									color: "oklch(0.50 0.010 60)"
								}}
							>
								License
							</a>
							<Link
								to="/contact"
								style={{
									fontFamily: "var(--font-sans)",
									fontSize: "0.6875rem",
									color: "oklch(0.50 0.010 60)"
								}}
							>
								Contact
							</Link>
							<Link
								to="/legals/privacy-policy"
								style={{
									fontFamily: "var(--font-sans)",
									fontSize: "0.6875rem",
									color: "oklch(0.50 0.010 60)"
								}}
							>
								Privacy Policy
							</Link>
						</div>

						{/* Account */}
						<div className="flex flex-col gap-2.5">
							<span
								style={{
									fontFamily: "var(--font-sans)",
									fontSize: "0.6875rem",
									fontWeight: 600,
									color: "oklch(0.50 0.010 60)"
								}}
							>
								Account
							</span>
							<Link
								to="/login"
								style={{
									fontFamily: "var(--font-sans)",
									fontSize: "0.6875rem",
									color: "oklch(0.50 0.010 60)"
								}}
							>
								Sign in
							</Link>
							<Link
								to="/activate"
								style={{
									fontFamily: "var(--font-sans)",
									fontSize: "0.6875rem",
									color: "oklch(0.50 0.010 60)"
								}}
							>
								Activate
							</Link>
						</div>
					</div>
				</div>
				<div
					className="px-4 py-4 text-center"
					style={{ borderTop: "1px solid oklch(0.88 0.008 80)" }}
				>
					<p
						className="text-xs"
						style={{
							color: "oklch(0.65 0.010 60)",
							fontFamily: "var(--font-sans)"
						}}
					>
						Made by AI and{" "}
						<span style={{ fontWeight: 500 }}>human hands.</span>{" "}
						Powered by Cloudflare.
					</p>
				</div>
			</footer>
		</div>
	);
}
