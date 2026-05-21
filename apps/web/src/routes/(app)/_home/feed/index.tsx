import {
	Suspense,
	useEffect,
	useMemo,
	useState,
	memo,
	useCallback
} from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { z } from "zod";
import { postsQueryOptions, toFeedAsset } from "@/routes/-fn/posts";
import type { FeedAsset } from "./-lib/feed-data";
import { PAGE_SIZE } from "./-lib/feed-data";
import { FeedCard } from "./-components/feed-card";
import { FooterSection } from "../-components/footer-section";

const feedSearchSchema = z.object({
	page: z.coerce.number().min(1).optional().default(1),
	tag: z.string().optional(),
	q: z.string().optional(),
	type: z.enum(["all", "video", "image"]).optional().default("all"),
	sort: z.enum(["newest", "popular"]).optional().default("newest")
});

export const Route = createFileRoute("/(app)/_home/feed/")({
	validateSearch: (s) => feedSearchSchema.parse(s),
	component: FeedPage
});

type TypeFilter = "all" | "video" | "image";
type SortOrder = "newest" | "popular";

function FeedGridSkeleton() {
	return (
		<div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
			{Array.from({ length: 6 }).map((_, i) => (
				<div
					key={i}
					className="aspect-[16/10] rounded-lg bg-muted animate-pulse"
				/>
			))}
		</div>
	);
}

interface FeedItemsProps {
	page: number;
	tag: string | undefined;
	q: string | undefined;
	type: TypeFilter;
	sort: SortOrder;
	onTagChange: (t: string | undefined) => void;
	onPageChange: (p: number) => void;
	onClearFilters: () => void;
}

const FeedItems = memo(function FeedItems({
	page,
	tag,
	q,
	type,
	sort,
	onTagChange,
	onPageChange,
	onClearFilters
}: FeedItemsProps) {
	const { data } = useSuspenseQuery(postsQueryOptions(1));
	const allAssets: FeedAsset[] = (data?.items ?? []).map(toFeedAsset);

	const tags = useMemo(
		() => [...new Set(allAssets.map((a) => a.tag).filter(Boolean))],
		[allAssets]
	);

	const filtered = useMemo(() => {
		let items = [...allAssets];
		if (type !== "all") items = items.filter((a) => a.type === type);
		if (tag) items = items.filter((a) => a.tag === tag);
		if (q)
			items = items.filter(
				(a) =>
					a.title.toLowerCase().includes(q.toLowerCase()) ||
					a.tag.toLowerCase().includes(q.toLowerCase())
			);
		if (sort === "popular") {
			items.sort((a, b) => b.popularity - a.popularity);
		} else {
			items.sort(
				(a, b) =>
					new Date(b.publishedAt).getTime() -
					new Date(a.publishedAt).getTime()
			);
		}
		return items;
	}, [allAssets, type, tag, q, sort]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const items = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	return (
		<>
			{/* Tag pills */}
			<div className="mb-8 flex items-center gap-2 overflow-x-auto pb-1">
				<button
					type="button"
					onClick={() => onTagChange(undefined)}
					className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
						!tag
							? "bg-foreground text-background"
							: "border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
					}`}
				>
					All
				</button>
				{tags.map((t) => (
					<button
						key={t}
						type="button"
						onClick={() => onTagChange(tag === t ? undefined : t)}
						className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
							tag === t
								? "bg-foreground text-background"
								: "border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
						}`}
					>
						{t}
					</button>
				))}
			</div>

			{/* Grid */}
			{items.length > 0 ? (
				<div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
					{items.map((asset) => (
						<FeedCard key={asset.id} asset={asset} />
					))}
				</div>
			) : (
				<div className="py-24 text-center">
					<p className="text-sm text-muted-foreground">
						No assets found
						{q ? ` for "${q}"` : tag ? ` tagged ${tag}` : ""}.
					</p>
					{(q || tag) && (
						<button
							type="button"
							onClick={onClearFilters}
							className="mt-3 text-sm text-primary hover:underline underline-offset-4"
						>
							Clear filters
						</button>
					)}
				</div>
			)}

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="mt-14 flex items-center justify-center gap-1.5">
					<button
						type="button"
						onClick={() => onPageChange(Math.max(1, page - 1))}
						disabled={page === 1}
						className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
					>
						←
					</button>
					{Array.from({ length: totalPages }).map((_, i) => (
						<button
							key={i}
							type="button"
							onClick={() => onPageChange(i + 1)}
							className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold transition-colors ${
								page === i + 1
									? "bg-foreground text-background"
									: "border border-border bg-card text-muted-foreground hover:text-foreground"
							}`}
						>
							{i + 1}
						</button>
					))}
					<button
						type="button"
						onClick={() =>
							onPageChange(Math.min(totalPages, page + 1))
						}
						disabled={page === totalPages}
						className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
					>
						→
					</button>
				</div>
			)}
		</>
	);
});

function FeedPage() {
	const { page, tag, q, type, sort } = Route.useSearch();
	const navigate = useNavigate({ from: "/feed/" });
	const [searchInput, setSearchInput] = useState(q ?? "");

	useEffect(() => {
		setSearchInput(q ?? "");
	}, [q]);

	const setSearch = useCallback(
		(updates: Record<string, unknown>) => {
			navigate({
				search: (prev) => ({ ...prev, ...updates, page: 1 })
			});
		},
		[navigate]
	);

	const handleSearchSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setSearch({ q: searchInput.trim() || undefined });
	};

	const setType = useCallback(
		(t: TypeFilter) => setSearch({ type: t }),
		[setSearch]
	);
	const setSort = useCallback(
		(s: SortOrder) => setSearch({ sort: s }),
		[setSearch]
	);
	const setTag = useCallback(
		(t: string | undefined) => setSearch({ tag: t }),
		[setSearch]
	);
	const setPage = useCallback(
		(p: number) => navigate({ search: (prev) => ({ ...prev, page: p }) }),
		[navigate]
	);
	const clearFilters = useCallback(
		() => setSearch({ q: undefined, tag: undefined, type: "all" }),
		[setSearch]
	);

	return (
		<>
			<main className="px-4 sm:px-6 pb-32 pt-24">
				<div className="mx-auto max-w-6xl">
					{/* Page header */}
					<div className="mb-8">
						<h1 className="font-heading font-bold text-2xl tracking-tight text-foreground">
							Assets
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Dark cinematic loops, backgrounds, and overlays.
						</p>
					</div>

					{/* Controls row */}
					<div className="flex flex-wrap items-center gap-3 mb-5">
						<form
							onSubmit={handleSearchSubmit}
							className="flex-1 min-w-[180px]"
						>
							<div className="relative">
								<HugeiconsIcon
									icon={Search01Icon}
									className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
								/>
								<input
									type="search"
									value={searchInput}
									onChange={(e) =>
										setSearchInput(e.target.value)
									}
									placeholder="Search assets..."
									className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring/50 transition-colors"
								/>
							</div>
						</form>

						<div className="flex items-center rounded-md border border-border bg-card p-0.5">
							{(["all", "video", "image"] as const).map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => setType(t)}
									className={`rounded px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
										type === t
											? "bg-foreground text-background"
											: "text-muted-foreground hover:text-foreground"
									}`}
								>
									{t}
								</button>
							))}
						</div>

						<div className="flex items-center rounded-md border border-border bg-card p-0.5">
							{(["newest", "popular"] as const).map((s) => (
								<button
									key={s}
									type="button"
									onClick={() => setSort(s)}
									className={`rounded px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
										sort === s
											? "bg-foreground text-background"
											: "text-muted-foreground hover:text-foreground"
									}`}
								>
									{s}
								</button>
							))}
						</div>
					</div>

					{/* Tag pills + grid + pagination — data-dependent */}
					<Suspense fallback={<FeedGridSkeleton />}>
						<FeedItems
							page={page}
							tag={tag}
							q={q}
							type={type}
							sort={sort}
							onTagChange={setTag}
							onPageChange={setPage}
							onClearFilters={clearFilters}
						/>
					</Suspense>
				</div>
			</main>
			<FooterSection />
		</>
	);
}
