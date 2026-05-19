import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { PostsData } from "@/routes/-fn/posts";

type Post = PostsData["items"][number];

const VIDEO_FORMATS = new Set(["mp4", "webm"]);

function formatDate(d: string | number | Date | null | undefined): string {
	if (!d) return "";
	const date = new Date(d);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric"
	});
}

export function PostCard({ post }: { post: Post }) {
	const [isHovered, setIsHovered] = useState(false);
	const format = (post as any).format as string | undefined;
	const fileUrl = (post as any).fileUrl as string | null | undefined;
	const isVideo = !!format && VIDEO_FORMATS.has(format);
	const hasCover = (post as any).coverThumb || post.coverImage;

	return (
		<Link
			to="/feed/$slug"
			params={{ slug: post.slug }}
			className="group block"
		>
			<article
				className="rounded-md border overflow-hidden transition-all hover:border-[oklch(0.62_0.14_47)]"
				style={{
					borderColor: "oklch(0.88 0.008 80)",
					background: "oklch(0.97 0.008 80)"
				}}
			>
				{hasCover && (
					<div
						className="aspect-[16/9] overflow-hidden relative"
						style={{ borderRadius: "0.375rem 0.375rem 0 0" }}
						onPointerEnter={() => setIsHovered(true)}
						onPointerLeave={() => setIsHovered(false)}
					>
						{isHovered && isVideo && fileUrl ? (
							<video
								autoPlay
								muted
								loop
								playsInline
								src={fileUrl}
								className="w-full h-full object-cover"
							/>
						) : (
							<img
								src={
									(post as any).coverThumb ??
									post.coverImage ??
									""
								}
								alt={post.title}
								className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
							/>
						)}
					</div>
				)}

				<div className="px-4 py-4">
					<h2
						className="leading-tight mb-2 transition-colors group-hover:text-[oklch(0.62_0.14_47)]"
						style={{
							fontFamily: "var(--font-heading)",
							fontWeight: 600,
							fontSize: "1.125rem",
							lineHeight: 1.25,
							letterSpacing: "-0.01em",
							color: "oklch(0.15 0.008 60)"
						}}
					>
						{post.title}
					</h2>

					{(post as any).format && (
						<div className="flex items-center gap-1.5 mb-2">
							<span
								className="rounded px-1.5 py-0.5 uppercase"
								style={{
									background: "oklch(0.62 0.14 47 / 0.12)",
									color: "oklch(0.52 0.14 47)",
									fontSize: "0.625rem",
									fontFamily: "var(--font-sans)",
									fontWeight: 600,
									letterSpacing: "0.04em"
								}}
							>
								{(post as any).format}
							</span>
							{(post as any).resolution && (
								<span
									className="rounded px-1.5 py-0.5"
									style={{
										background: "oklch(0.92 0.006 80)",
										color: "oklch(0.50 0.010 60)",
										fontSize: "0.625rem",
										fontFamily: "var(--font-sans)",
										fontWeight: 500,
										letterSpacing: "0.02em"
									}}
								>
									{(post as any).resolution}
								</span>
							)}
							{(post as any).access === "free" && (
								<span
									className="rounded px-1.5 py-0.5"
									style={{
										background:
											"oklch(0.85 0.09 145 / 0.15)",
										color: "oklch(0.45 0.12 145)",
										fontSize: "0.625rem",
										fontFamily: "var(--font-sans)",
										fontWeight: 600,
										letterSpacing: "0.02em"
									}}
								>
									Free
								</span>
							)}
						</div>
					)}

					<div className="flex items-center justify-between gap-2 mt-3">
						<div className="flex flex-wrap gap-1">
							{Array.isArray(post.tags) &&
								post.tags.slice(0, 3).map((tag) => (
									<span
										key={tag}
										className="rounded px-1.5 py-0.5"
										style={{
											background: "oklch(0.94 0.025 55)",
											color: "oklch(0.52 0.14 47)",
											fontSize: "0.6875rem",
											fontFamily: "var(--font-sans)",
											fontWeight: 500,
											letterSpacing: "0.01em"
										}}
									>
										{tag}
									</span>
								))}
						</div>
						{post.publishedAt && (
							<time
								className="text-xs shrink-0"
								style={{
									color: "oklch(0.50 0.010 60)",
									fontFamily: "var(--font-sans)"
								}}
							>
								{formatDate(post.publishedAt)}
							</time>
						)}
					</div>
				</div>
			</article>
		</Link>
	);
}

export function PostCardSkeleton() {
	return (
		<div
			className="rounded-md border overflow-hidden"
			style={{
				borderColor: "oklch(0.88 0.008 80)",
				background: "oklch(0.97 0.008 80)"
			}}
		>
			<div
				className="aspect-[16/9]"
				style={{ background: "oklch(0.92 0.006 80)" }}
			/>
			<div className="px-4 py-4 flex flex-col gap-3">
				<div
					className="h-5 rounded"
					style={{ background: "oklch(0.92 0.006 80)", width: "70%" }}
				/>
				<div
					className="h-4 rounded"
					style={{ background: "oklch(0.92 0.006 80)", width: "45%" }}
				/>
			</div>
		</div>
	);
}
