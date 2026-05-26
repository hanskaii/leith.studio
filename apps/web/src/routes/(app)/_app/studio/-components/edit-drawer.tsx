import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	Button,
	Input,
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	Spinner,
	Textarea,
	toast
} from "@workspace/ui";
import { updatePostFn, type CreatorPost } from "@/routes/-fn/creator";

type Props = {
	post: CreatorPost | null;
	open: boolean;
	onClose: () => void;
};

export function EditDrawer({ post, open, onClose }: Props) {
	const qc = useQueryClient();
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [access, setAccess] = useState<"free" | "premium">("premium");

	// Re-seed local state whenever a new post enters the drawer.
	useEffect(() => {
		if (!post) return;
		setTitle(post.title ?? "");
		setBody(post.body ?? "");
		setAccess((post.access as "free" | "premium") ?? "premium");
	}, [post?.id]);

	const updateMutation = useMutation({
		mutationFn: async (patch: {
			title?: string;
			body?: string;
			access?: "free" | "premium";
		}) => {
			if (!post) return;
			await updatePostFn({
				data: { data: { id: post.id, data: patch as any } }
			});
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["creator-posts"] });
		},
		onError: (err: any) => {
			toast.error(err?.message ?? "Failed to save");
		}
	});

	function commit(field: "title" | "body" | "access", value: string) {
		if (!post) return;
		if (field === "title" && value === post.title) return;
		if (field === "body" && value === post.body) return;
		if (field === "access" && value === post.access) return;
		updateMutation.mutate({ [field]: value } as any);
	}

	return (
		<Sheet open={open} onOpenChange={(v) => !v && onClose()}>
			<SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
				<SheetHeader className="border-b px-5 py-4">
					<SheetTitle className="text-base">Edit post</SheetTitle>
				</SheetHeader>

				{!post ? (
					<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
						Select a post to edit
					</div>
				) : (
					<div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-medium text-muted-foreground">
								Title
							</label>
							<Input
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								onBlur={(e) => commit("title", e.target.value)}
								placeholder="Untitled"
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-medium text-muted-foreground">
								Description
							</label>
							<Textarea
								value={body}
								onChange={(e) => setBody(e.target.value)}
								onBlur={(e) => commit("body", e.target.value)}
								placeholder="Describe this asset…"
								rows={6}
							/>
						</div>

						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-medium text-muted-foreground">
								Access
							</label>
							<div className="inline-flex rounded-md border p-0.5 w-fit">
								{(["free", "premium"] as const).map((opt) => (
									<button
										key={opt}
										type="button"
										onClick={() => {
											setAccess(opt);
											commit("access", opt);
										}}
										className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
											access === opt
												? "bg-primary text-primary-foreground"
												: "text-muted-foreground hover:bg-muted"
										}`}
									>
										{opt === "free" ? "Free" : "Premium"}
									</button>
								))}
							</div>
						</div>

						<div className="flex flex-col gap-1 text-xs text-muted-foreground">
							<div>
								<span className="font-medium text-foreground">
									Status:
								</span>{" "}
								{post.status}
								{" · "}
								media {post.mediaStatus}
								{post.enrichmentStatus &&
									` · AI ${post.enrichmentStatus}`}
							</div>
							<div>
								<span className="font-medium text-foreground">
									Slug:
								</span>{" "}
								{post.slug}
							</div>
						</div>
					</div>
				)}

				<div className="border-t px-5 py-3 flex items-center justify-between">
					<span className="text-xs text-muted-foreground">
						{updateMutation.isPending ? (
							<span className="inline-flex items-center gap-1.5">
								<Spinner className="size-3" />
								Saving…
							</span>
						) : (
							"Changes save on blur"
						)}
					</span>
					<Button variant="outline" size="sm" onClick={onClose}>
						Close
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}
