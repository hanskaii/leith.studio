import { useEffect, useMemo, useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
	creatorPostsQueryOptions,
	type CreatorPost
} from "@/routes/-fn/creator";
import { FileCard } from "./file-card";
import { ActionBar } from "./action-bar";
import { EditDrawer } from "./edit-drawer";

const POLL_INTERVAL_MS = 5000;

export function StudioGrid({ selectedId }: { selectedId?: string }) {
	const qc = useQueryClient();
	const navigate = useNavigate();
	const { data: posts } = useSuspenseQuery(creatorPostsQueryOptions());
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const list = (posts ?? []) as CreatorPost[];

	// Poll while any visible card is still being enriched. Stops automatically
	// when nothing's in-flight and resumes when the tab regains focus.
	const hasPending = useMemo(
		() =>
			list.some(
				(p) =>
					p.enrichmentStatus === "pending" ||
					p.enrichmentStatus === "processing" ||
					p.mediaStatus === "pending"
			),
		[list]
	);

	useEffect(() => {
		if (!hasPending) return;
		const interval = setInterval(() => {
			if (document.hidden) return;
			qc.invalidateQueries({ queryKey: ["creator-posts"] });
		}, POLL_INTERVAL_MS);
		return () => clearInterval(interval);
	}, [hasPending, qc]);

	const drawerPost = selectedId
		? (list.find((p) => p.id === selectedId) ?? null)
		: null;

	function toggleSelect(id: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function openDrawer(id: string) {
		navigate({
			to: "/studio",
			search: (prev: any) => ({ ...prev, selected: id }),
			replace: true
		});
	}

	function closeDrawer() {
		navigate({
			to: "/studio",
			search: (prev: any) => {
				const { selected: _, ...rest } = prev ?? {};
				return rest;
			},
			replace: true
		});
	}

	if (list.length === 0) {
		return (
			<div className="rounded-lg border border-dashed py-14 text-center text-sm text-muted-foreground">
				No files yet. Drop something above to get started.
			</div>
		);
	}

	return (
		<>
			<ActionBar
				selected={selected}
				posts={list}
				onClear={() => setSelected(new Set())}
			/>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
				{list.map((post) => (
					<FileCard
						key={post.id}
						post={post}
						selected={selected.has(post.id)}
						onToggleSelect={toggleSelect}
						onOpenDrawer={openDrawer}
					/>
				))}
			</div>
			<EditDrawer
				post={drawerPost}
				open={!!drawerPost}
				onClose={closeDrawer}
			/>
		</>
	);
}
