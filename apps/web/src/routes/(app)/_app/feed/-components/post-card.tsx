import { Link } from "@tanstack/react-router";
import type { PostsData } from "@/routes/-fn/posts";

type Post = PostsData["items"][number];

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
				{post.coverImage && (
					<div
						className="aspect-[16/9] overflow-hidden"
						style={{ borderRadius: "0.375rem 0.375rem 0 0" }}
					>
						<img
							src={post.coverImage}
							alt={post.title}
							className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
						/>
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
