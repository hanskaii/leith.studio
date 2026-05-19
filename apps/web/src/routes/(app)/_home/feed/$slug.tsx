import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft01Icon, Download01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button, toast } from "@workspace/ui";
import { FEED_ASSETS } from "./-lib/feed-data";
import { FooterSection } from "../-components/footer-section";
import { FeedCard } from "./-components/feed-card";

export const Route = createFileRoute("/(app)/_home/feed/$slug")({
	component: AssetPage
});

function AssetPage() {
	const { slug } = Route.useParams();
	const asset = FEED_ASSETS.find((a) => a.slug === slug);

	if (!asset) {
		return (
			<>
				<main className="flex min-h-[50dvh] items-center justify-center px-4 pt-24">
					<div className="text-center">
						<p className="text-sm text-muted-foreground">
							Asset not found.
						</p>
						<Link
							to="/feed"
							search={{ page: 1 }}
							className="mt-3 inline-block text-sm text-primary hover:underline underline-offset-4"
						>
							← Back to feed
						</Link>
					</div>
				</main>
				<FooterSection />
			</>
		);
	}

	const isVideo = asset.type === "video";

	const sameTag = FEED_ASSETS.filter(
		(a) => a.id !== asset.id && a.tag === asset.tag
	);
	const others = FEED_ASSETS.filter(
		(a) => a.id !== asset.id && a.tag !== asset.tag
	);
	const related = [...sameTag, ...others].slice(0, 3);

	const specs = [
		{ label: "Format", value: asset.format.toUpperCase() },
		{ label: "Resolution", value: asset.resolution },
		{ label: "Type", value: isVideo ? "Video loop" : "Still image" },
		{
			label: "Access",
			value: asset.access === "free" ? "Free" : "All Access"
		}
	];

	return (
		<>
			<main className="px-4 sm:px-6 pb-24 pt-24">
				<div className="mx-auto max-w-4xl">
					{/* Breadcrumb */}
					<nav className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground">
						<Link
							to="/feed"
							search={{ page: 1 }}
							className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
						>
							<HugeiconsIcon
								icon={ArrowLeft01Icon}
								className="h-3.5 w-3.5"
								strokeWidth={2}
							/>
							Feed
						</Link>
						<span className="text-border/80">/</span>
						<span className="text-foreground/60">{asset.tag}</span>
					</nav>

					{/* Media */}
					<div className="mb-10 aspect-[16/9] overflow-hidden rounded-lg bg-muted">
						{isVideo && asset.fileUrl ? (
							<video
								autoPlay
								muted
								loop
								playsInline
								controls
								src={asset.fileUrl}
								className="h-full w-full object-cover"
							/>
						) : (
							<img
								src={asset.coverThumb}
								alt={asset.title}
								className="h-full w-full object-cover"
								loading="eager"
							/>
						)}
					</div>

					{/* Two-column */}
					<div className="grid gap-10 lg:grid-cols-[1fr_224px]">
						{/* Left: identity */}
						<div>
							<div className="mb-3 flex flex-wrap items-center gap-2">
								<span className="rounded border border-border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
									{asset.tag}
								</span>
								{asset.access === "members" && (
									<span className="rounded bg-primary px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-primary-foreground">
										All Access
									</span>
								)}
							</div>

							<h1 className="font-heading font-bold text-[1.75rem] leading-[1.05] tracking-[-0.025em] text-foreground">
								{asset.title}
							</h1>

							<p className="mt-2.5 text-sm text-muted-foreground">
								{asset.format.toUpperCase()} ·{" "}
								{asset.resolution} ·{" "}
								{isVideo ? "Seamless loop" : "Still image"}
							</p>
						</div>

						{/* Right: action + specs */}
						<div className="flex flex-col gap-5">
							{asset.access === "free" ? (
								<Button
									className="w-full gap-2"
									onClick={() =>
										toast.success(
											"Preparing your download…"
										)
									}
								>
									<HugeiconsIcon
										icon={Download01Icon}
										className="h-4 w-4"
										strokeWidth={2}
									/>
									Download — Free
								</Button>
							) : (
								<div className="flex flex-col gap-1.5">
									<Button asChild className="w-full">
										<a href="/activate">Get All Access</a>
									</Button>
									<p className="text-center text-[11px] text-muted-foreground">
										Included in All Access
									</p>
								</div>
							)}

							{/* Spec rows */}
							<div>
								<p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">
									Specifications
								</p>
								{specs.map((row, i) => (
									<div
										key={row.label}
										className={`flex items-center justify-between py-2 ${
											i < specs.length - 1
												? "border-b border-border/40"
												: ""
										}`}
									>
										<span className="text-xs text-muted-foreground">
											{row.label}
										</span>
										<span className="text-xs font-semibold text-foreground">
											{row.value}
										</span>
									</div>
								))}
							</div>
						</div>
					</div>

					{/* Related */}
					{related.length > 0 && (
						<div className="mt-16 border-t border-border/40 pt-10">
							<p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
								More like this
							</p>
							<h2 className="mb-6 font-heading font-bold text-xl tracking-tight text-foreground">
								{asset.tag} assets
							</h2>
							<div className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
								{related.map((a) => (
									<FeedCard
										key={a.id}
										asset={a}
										aspect="aspect-[14/9]"
									/>
								))}
							</div>
						</div>
					)}
				</div>
			</main>
			<FooterSection />
		</>
	);
}
