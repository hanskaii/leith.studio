import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useMemo } from "react";
import { z } from "zod";
import { postsQueryOptions } from "@/routes/-fn/posts";
import { PostCard, PostCardSkeleton } from "./-components/post-card";

const feedSearchSchema = z.object({
	page: z.coerce.number().min(1).optional().default(1),
	tag: z.string().optional()
});

export const Route = createFileRoute("/(app)/_app/feed/")({
	validateSearch: (s) => feedSearchSchema.parse(s),
	component: FeedPage
});

function FeedSkeleton() {
	return (
		<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
			{Array.from({ length: 6 }).map((_, i) => (
				<PostCardSkeleton key={i} />
			))}
		</div>
	);
}

function PostGrid({ page, tag }: { page: number; tag?: string }) {
	const { data } = useSuspenseQuery(postsQueryOptions(page, tag));
	const navigate = useNavigate({ from: "/feed" });

	if (!data?.items?.length) {
		return (
			<div
				className="py-24 text-center"
				style={{
					color: "oklch(0.50 0.010 60)",
					fontFamily: "var(--font-sans)"
				}}
			>
				<p className="text-sm">
					No posts found{tag ? ` for #${tag}` : ""}.
				</p>
			</div>
		);
	}

	const totalPages = Math.ceil((data.total ?? 0) / (data.pageSize ?? 12));

	return (
		<div className="flex flex-col gap-8">
			<div className="grid gap-5 sm:grid-cols-2 md:grid-cols-[2fr_1fr]">
				{data.items.map((post) => (
					<PostCard key={post.id} post={post} />
				))}
			</div>

			{totalPages > 1 && (
				<div className="flex items-center justify-center gap-2">
					{Array.from({ length: totalPages }).map((_, i) => (
						<button
							key={i}
							onClick={() =>
								navigate({
									search: (prev) => ({ ...prev, page: i + 1 })
								})
							}
							className="w-8 h-8 rounded-md text-xs font-medium transition-all"
							style={{
								background:
									page === i + 1
										? "oklch(0.62 0.14 47)"
										: "oklch(0.92 0.006 80)",
								color:
									page === i + 1
										? "oklch(0.97 0.008 80)"
										: "oklch(0.50 0.010 60)",
								fontFamily: "var(--font-sans)"
							}}
						>
							{i + 1}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

function TagFilter({
	allTags,
	activeTag
}: {
	allTags: string[];
	activeTag?: string;
}) {
	const navigate = useNavigate({ from: "/feed" });
	if (!allTags.length) return null;

	return (
		<div className="flex flex-wrap gap-2 mb-6">
			<button
				onClick={() =>
					navigate({
						search: (prev) => ({ ...prev, tag: undefined, page: 1 })
					})
				}
				className="rounded-md px-3 py-1 text-xs font-medium transition-all"
				style={{
					background: !activeTag
						? "oklch(0.62 0.14 47)"
						: "oklch(0.92 0.006 80)",
					color: !activeTag
						? "oklch(0.97 0.008 80)"
						: "oklch(0.50 0.010 60)",
					fontFamily: "var(--font-sans)"
				}}
			>
				All
			</button>
			{allTags.map((tag) => (
				<button
					key={tag}
					onClick={() =>
						navigate({
							search: (prev) => ({ ...prev, tag, page: 1 })
						})
					}
					className="rounded-md px-3 py-1 text-xs font-medium transition-all"
					style={{
						background:
							activeTag === tag
								? "oklch(0.62 0.14 47)"
								: "oklch(0.92 0.006 80)",
						color:
							activeTag === tag
								? "oklch(0.97 0.008 80)"
								: "oklch(0.50 0.010 60)",
						fontFamily: "var(--font-sans)"
					}}
				>
					{tag}
				</button>
			))}
		</div>
	);
}

function FeedWithTags({ page, tag }: { page: number; tag?: string }) {
	const { data } = useSuspenseQuery(postsQueryOptions(page, tag));

	const allTags = useMemo(() => {
		const tagSet = new Set<string>();
		data?.items?.forEach((p) => {
			if (Array.isArray(p.tags)) p.tags.forEach((t) => tagSet.add(t));
		});
		return Array.from(tagSet);
	}, [data]);

	return (
		<>
			<TagFilter allTags={allTags} activeTag={tag} />
			<PostGrid page={page} tag={tag} />
		</>
	);
}

function FeedPage() {
	const { page, tag } = Route.useSearch();

	return (
		<div
			className="flex flex-col gap-0 min-h-[100dvh]"
			style={{ background: "oklch(0.97 0.008 80)" }}
		>
			<div className="px-8 py-8 md:px-14">
				<h1
					className="mb-1"
					style={{
						fontFamily: "var(--font-heading)",
						fontWeight: 600,
						fontSize: "1.75rem",
						lineHeight: 1.1,
						letterSpacing: "-0.02em",
						color: "oklch(0.15 0.008 60)"
					}}
				>
					Breakdowns
				</h1>
				<p
					className="text-sm mb-8"
					style={{
						color: "oklch(0.50 0.010 60)",
						fontFamily: "var(--font-sans)"
					}}
				>
					All AI image creation technique notes
				</p>

				<Suspense fallback={<FeedSkeleton />}>
					<FeedWithTags page={page} tag={tag} />
				</Suspense>
			</div>
		</div>
	);
}
