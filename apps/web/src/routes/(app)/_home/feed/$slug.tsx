import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft01Icon, Download01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button, toast } from "@workspace/ui";
import { FEED_ASSETS } from "./-lib/feed-data";
import { FooterSection } from "../-components/footer-section";

export const Route = createFileRoute("/(app)/_home/feed/$slug")({
	component: AssetPage
});

function AssetPage() {
	const { slug } = Route.useParams();
	const asset = FEED_ASSETS.find((a) => a.slug === slug);

	if (!asset) {
		return (
			<div className="flex min-h-[100dvh] items-center justify-center pt-32">
				<div className="text-center">
					<p className="text-sm text-muted-foreground">
						Asset not found.
					</p>
					<Link
						to="/feed"
						search={{ page: 1 }}
						className="mt-4 inline-block text-sm text-primary hover:underline underline-offset-4"
					>
						← Back to feed
					</Link>
				</div>
			</div>
		);
	}

	const isVideo = asset.type === "video";

	const specs = [
		{ label: "Format", value: asset.format.toUpperCase() },
		{ label: "Resolution", value: asset.resolution },
		{ label: "Type", value: isVideo ? "Video Loop" : "Still Image" },
		{
			label: "Access",
			value: asset.access === "free" ? "Free" : "All Access Members"
		}
	];

	return (
		<>
			<main className="px-4 sm:px-6 pb-32 pt-24">
				<div className="mx-auto max-w-3xl">
					{/* Back */}
					<Link
						to="/feed"
						search={{ page: 1 }}
						className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
					>
						<HugeiconsIcon
							icon={ArrowLeft01Icon}
							className="h-4 w-4"
							strokeWidth={2}
						/>
						Back to feed
					</Link>

					{/* Media */}
					<div className="mb-8 aspect-[16/9] overflow-hidden rounded-md bg-muted">
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
							/>
						)}
					</div>

					{/* Header */}
					<div className="mb-8 flex items-start justify-between gap-4">
						<div>
							<div className="mb-2 flex items-center gap-2">
								<span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
									{asset.tag}
								</span>
								{asset.access === "members" && (
									<span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
										Members
									</span>
								)}
							</div>
							<h1 className="font-heading font-bold text-2xl tracking-tight text-foreground">
								{asset.title}
							</h1>
						</div>

						{asset.access === "free" ? (
							<Button
								className="shrink-0 gap-2"
								onClick={() =>
									toast.success("Preparing your download...")
								}
							>
								<HugeiconsIcon
									icon={Download01Icon}
									className="h-4 w-4"
									strokeWidth={2}
								/>
								Download
							</Button>
						) : (
							<Button asChild className="shrink-0">
								<a href="/activate">Get All Access</a>
							</Button>
						)}
					</div>

					{/* Spec table */}
					<div className="overflow-hidden rounded-md border border-border">
						<div className="border-b border-border bg-muted px-4 py-2.5">
							<p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
								Specifications
							</p>
						</div>
						{specs.map((row, i) => (
							<div
								key={row.label}
								className={`flex items-center justify-between px-4 py-3 ${
									i < specs.length - 1
										? "border-b border-border/50"
										: ""
								}`}
							>
								<span className="text-xs text-muted-foreground">
									{row.label}
								</span>
								<span className="text-xs font-medium text-foreground">
									{row.value}
								</span>
							</div>
						))}
					</div>
				</div>
			</main>
			<FooterSection />
		</>
	);
}
