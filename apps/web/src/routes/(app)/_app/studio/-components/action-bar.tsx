import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, toast } from "@workspace/ui";
import { updatePostFn, type CreatorPost } from "@/routes/-fn/creator";

export function ActionBar({
	selected,
	posts,
	onClear
}: {
	selected: Set<string>;
	posts: CreatorPost[];
	onClear: () => void;
}) {
	const qc = useQueryClient();
	const publishable = posts.filter(
		(p) => selected.has(p.id) && p.status === "draft"
	);

	const publishMutation = useMutation({
		mutationFn: async () => {
			const results = await Promise.allSettled(
				publishable.map((p) =>
					updatePostFn({
						data: {
							data: {
								id: p.id,
								data: { status: "published" } as any
							}
						}
					})
				)
			);
			const failed = results.filter(
				(r) => r.status === "rejected"
			).length;
			const succeeded = results.length - failed;
			return {
				succeeded,
				failed,
				skipped: selected.size - results.length
			};
		},
		onSuccess: ({ succeeded, failed, skipped }) => {
			qc.invalidateQueries({ queryKey: ["creator-posts"] });
			onClear();
			if (failed > 0) {
				toast.error(
					`${succeeded} published, ${failed} failed${skipped ? `, ${skipped} skipped` : ""}`
				);
			} else if (skipped > 0) {
				toast.success(
					`${succeeded} published, ${skipped} skipped (already published)`
				);
			} else {
				toast.success(`${succeeded} published`);
			}
		}
	});

	if (selected.size === 0) return null;

	return (
		<div className="sticky top-0 z-10 -mx-6 mb-4 flex items-center justify-between border-b bg-background/80 px-6 py-3 backdrop-blur">
			<div className="flex items-center gap-3">
				<span className="text-sm font-medium">
					{selected.size} selected
				</span>
				<Button
					variant="ghost"
					size="sm"
					onClick={onClear}
					className="h-7 text-xs"
				>
					Clear
				</Button>
			</div>
			<Button
				size="sm"
				disabled={publishable.length === 0 || publishMutation.isPending}
				onClick={() => publishMutation.mutate()}
			>
				{publishMutation.isPending
					? "Publishing…"
					: `Publish selected${publishable.length < selected.size ? ` (${publishable.length})` : ""}`}
			</Button>
		</div>
	);
}
