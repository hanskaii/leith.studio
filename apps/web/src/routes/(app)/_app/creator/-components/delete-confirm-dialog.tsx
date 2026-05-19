import { Button, Spinner } from "@workspace/ui";
import type { CreatorPost } from "@/routes/-fn/creator";

export function DeleteConfirmDialog({
	post,
	onConfirm,
	onCancel,
	isPending
}: {
	post: CreatorPost;
	onConfirm: () => void;
	onCancel: () => void;
	isPending: boolean;
}) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
			<div className="rounded-md border border-border bg-background p-6 w-full max-w-sm shadow-lg">
				<h3 className="font-heading font-semibold text-lg tracking-[-0.01em] text-foreground mb-2">
					Delete post?
				</h3>
				<p className="text-sm mb-6 text-muted-foreground">
					"{post.title}" will be permanently deleted. This can't be
					undone.
				</p>
				<div className="flex gap-3 justify-end">
					<Button variant="outline" onClick={onCancel}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={onConfirm}
						disabled={isPending}
					>
						{isPending && <Spinner />}
						{isPending ? "Deleting..." : "Delete"}
					</Button>
				</div>
			</div>
		</div>
	);
}
