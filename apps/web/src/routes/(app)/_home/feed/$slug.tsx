import { Suspense } from "react";
import { Image } from "@unpic/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft01Icon, Download01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@workspace/ui";
import {
	postQueryOptions,
	postsQueryOptions,
	toFeedAsset
} from "@/routes/-fn/posts";
import { FooterSection } from "../-components/footer-section";
import { FeedCard, FeedCardSkeleton } from "./-components/feed-card";

export const Route = createFileRoute("/(app)/_home/feed/$slug")({
	component: AssetPage
});

function AssetDetailSkeleton() {
	return (
		<main className="px-4 sm:px-6 pb-24 pt-24">
			<div className="mx-auto max-w-4xl animate-pulse">
				<div className="mb-8 h-4 w-32 rounded bg-muted" />
				<div className="mb-10 aspect-[16/9] rounded-lg bg-muted" />
				<div className="grid gap-10 lg:grid-cols-[1fr_224px]">
					<div className="space-y-3">
						<div className="h-3 w-20 rounded bg-muted" />
						<div className="h-8 w-2/3 rounded bg-muted" />
						<div className="h-4 w-1/3 rounded bg-muted" />
					</div>
					<div className="space-y-3">
						<div className="h-10 rounded bg-muted" />
						<div className="h-32 rounded bg-muted" />
					</div>
				</div>
			</div>
		</main>
	);
}

function RelatedPostsSkeleton() {
	return (
		<div className="mt-16 border-t border-border/40 pt-10">
			<div className="mb-6 h-5 w-32 rounded bg-muted animate-pulse" />
			<div className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 3 }).map((_, i) => (
					<FeedCardSkeleton key={i} />
				))}
			</div>
		</div>
	);
}

function RelatedPosts({
	tagSlug,
	tagName,
	currentId
}: {
	tagSlug: string;
	tagName: string;
	currentId: string;
}) {
	const { data } = useSuspenseQuery(postsQueryOptions(1));
	const items = data?.items ?? [];

	const hasTag = (p: (typeof items)[number]) =>
		Array.isArray(p.tags) &&
		p.tags.some((t: { slug: string }) => t.slug === tagSlug);

	const sameTag = items.filter((p) => p.id !== currentId && hasTag(p));
	const others = items.filter((p) => p.id !== currentId && !hasTag(p));
	const related = [...sameTag, ...others].slice(0, 3).map(toFeedAsset);

	if (related.length === 0) return null;

	return (
		<div className="mt-16 border-t border-border/40 pt-10">
			<p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
				More like this
			</p>
			<h2 className="mb-6 font-heading font-bold text-xl tracking-tight text-foreground">
				{tagName} assets
			</h2>
			<div className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
				{related.map((a) => (
					<FeedCard key={a.id} asset={a} aspect="aspect-[14/9]" />
				))}
			</div>
		</div>
	);
}

function AssetDetail() {
	const { slug } = Route.useParams();
	const { data: post } = useSuspenseQuery(postQueryOptions(slug));

	if (!post) return null;

	const VIDEO_FORMATS = new Set(["mp4", "webm"]);
	const AUDIO_FORMATS = new Set(["mp3", "wav", "ogg", "aac"]);
	const isVideo = VIDEO_FORMATS.has(post.format);
	const isAudio = AUDIO_FORMATS.has(post.format);
	const primaryTag = Array.isArray(post.tags) ? post.tags[0] : undefined;
	const tagName = primaryTag?.name ?? "";
	const tagSlug = primaryTag?.slug;

	const assetTypeLabel = isVideo
		? "Video loop"
		: isAudio
			? "Audio"
			: "Still image";

	const specs = [
		{ label: "Format", value: post.format.toUpperCase() },
		...(!isAudio ? [{ label: "Resolution", value: post.resolution }] : []),
		{ label: "Type", value: assetTypeLabel },
		{
			label: "Access",
			value: post.access === "free" ? "Free" : "All Access"
		}
	];

	return (
		<main className="px-4 sm:px-6 pb-24 pt-24">
			<div className="mx-auto max-w-4xl">
				{/* Breadcrumb */}
				<nav className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground">
					<Link
						to="/feed"
						search={{ page: 1, type: "all", sort: "newest" }}
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
					<span className="text-foreground/60">{tagName}</span>
				</nav>

				{/* Media */}
				<div
					className={`mb-10 overflow-hidden rounded-lg bg-muted ${isAudio ? "" : "aspect-[16/9]"}`}
				>
					{isVideo && post.previewUrl ? (
						<video
							autoPlay
							muted
							loop
							playsInline
							controls
							src={post.previewUrl}
							className="h-full w-full object-cover"
						/>
					) : isAudio && post.previewUrl ? (
						<div className="flex flex-col items-center gap-4 px-6 py-10">
							<Image
								src={post.coverThumb ?? ""}
								alt={post.title}
								width={160}
								height={160}
								className="rounded-md object-cover shadow-md"
								loading="eager"
							/>
							<audio
								controls
								src={post.previewUrl}
								className="w-full max-w-lg"
							/>
						</div>
					) : (
						<div className="relative h-full w-full">
							<img
								src={post.coverThumb ?? ""}
								alt={post.title}
								className="absolute inset-0 h-full w-full object-cover"
								loading="eager"
							/>
						</div>
					)}
				</div>

				{/* Two-column */}
				<div className="grid gap-10 lg:grid-cols-[1fr_224px]">
					{/* Left: identity */}
					<div>
						<div className="mb-3 flex flex-wrap items-center gap-2">
							{tagName && (
								<span className="rounded border border-border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
									{tagName}
								</span>
							)}
							{post.access !== "free" && (
								<span className="rounded bg-primary px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-primary-foreground">
									All Access
								</span>
							)}
						</div>

						<h1 className="font-heading font-bold text-[1.75rem] leading-[1.05] tracking-[-0.025em] text-foreground">
							{post.title}
						</h1>

						<p className="mt-2.5 text-sm text-muted-foreground">
							{post.format.toUpperCase()}
							{!isAudio && ` · ${post.resolution}`}
							{" · "}
							{isVideo
								? "Seamless loop"
								: isAudio
									? "Audio"
									: "Still image"}
						</p>
					</div>

					{/* Right: action + specs */}
					<div className="flex flex-col gap-5">
						{post.access === "free" ? (
							<Button asChild className="w-full gap-2">
								<a
									href={`/api/v1/posts/${slug}/download`}
									download
								>
									<HugeiconsIcon
										icon={Download01Icon}
										className="h-4 w-4"
										strokeWidth={2}
									/>
									Download — Free
								</a>
							</Button>
						) : (
							<div className="flex flex-col gap-1.5">
								<Button asChild className="w-full">
									<Link to="/activate">Get All Access</Link>
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
				{tagSlug && (
					<Suspense fallback={<RelatedPostsSkeleton />}>
						<RelatedPosts
							tagSlug={tagSlug}
							tagName={tagName}
							currentId={post.id}
						/>
					</Suspense>
				)}
			</div>
		</main>
	);
}

function AssetPage() {
	return (
		<>
			<Suspense fallback={<AssetDetailSkeleton />}>
				<AssetDetail />
			</Suspense>
			<FooterSection />
		</>
	);
}
