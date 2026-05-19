import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
	useSuspenseQuery,
	useMutation,
	useQueryClient
} from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { Gate } from "@workspace/core";
import { toast } from "@workspace/ui";
import {
	creatorPostsQueryOptions,
	deletePostFn,
	updatePostFn,
	type CreatorPost
} from "@/routes/-fn/creator";
import { DeleteConfirmDialog } from "./-components/delete-confirm-dialog";
import { TableSkeleton } from "./-components/table-skeleton";
import { PostRow } from "./-components/post-row";

export const Route = createFileRoute("/(app)/_app/creator/")({
	beforeLoad: async ({ context }) => {
		const result = await Gate.can("content.manage", {
			actor: context.session.user
		});
		if (!result.allowed) {
			throw redirect({ to: "/feed" });
		}
	},
	component: CreatorDashboardPage
});

function PostsTable() {
	const queryClient = useQueryClient();
	const { data: posts } = useSuspenseQuery(creatorPostsQueryOptions());
	const [deleteTarget, setDeleteTarget] = useState<CreatorPost | null>(null);

	const publishMutation = useMutation({
		mutationFn: ({
			id,
			status
		}: {
			id: string;
			status: "draft" | "published";
		}) => updatePostFn({ data: { data: { id, data: { status } } } }),
		onSuccess: (_, { status }) => {
			toast.success(
				status === "published" ? "Post published" : "Post unpublished"
			);
			queryClient.invalidateQueries({ queryKey: ["creator-posts"] });
		},
		onError: (err: any) =>
			toast.error(err?.message || "Failed to update post")
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deletePostFn({ data: { data: id } }),
		onSuccess: () => {
			toast.success("Post deleted");
			setDeleteTarget(null);
			queryClient.invalidateQueries({ queryKey: ["creator-posts"] });
		},
		onError: (err: any) => {
			toast.error(err?.message || "Failed to delete post");
			setDeleteTarget(null);
		}
	});

	return (
		<>
			{deleteTarget && (
				<DeleteConfirmDialog
					post={deleteTarget}
					onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
					onCancel={() => setDeleteTarget(null)}
					isPending={deleteMutation.isPending}
				/>
			)}

			<div
				className="overflow-x-auto rounded-md border"
				style={{ borderColor: "oklch(0.88 0.008 80)" }}
			>
				<table
					className="w-full text-sm"
					style={{ fontFamily: "var(--font-sans)" }}
				>
					<thead>
						<tr
							style={{
								borderBottom: "1px solid oklch(0.88 0.008 80)",
								background: "oklch(0.94 0.025 55)"
							}}
						>
							{["Title", "Status", "Published", "Actions"].map(
								(h) => (
									<th
										key={h}
										className="px-4 py-3 text-left font-medium text-xs"
										style={{
											color: "oklch(0.50 0.010 60)",
											letterSpacing: "0.01em"
										}}
									>
										{h}
									</th>
								)
							)}
						</tr>
					</thead>
					<tbody>
						{posts?.map((post) => (
							<PostRow
								key={post.id}
								post={post}
								onPublish={(id, status) =>
									publishMutation.mutate({ id, status })
								}
								onDelete={setDeleteTarget}
								isUpdating={publishMutation.isPending}
							/>
						))}
						{!posts?.length && (
							<tr>
								<td
									colSpan={4}
									className="px-4 py-10 text-center text-sm"
									style={{ color: "oklch(0.50 0.010 60)" }}
								>
									No posts yet.{" "}
									<Link
										to="/creator/$id"
										params={{ id: "new" }}
										style={{ color: "oklch(0.62 0.14 47)" }}
									>
										Create your first post
									</Link>
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</>
	);
}

function CreatorDashboardPage() {
	return (
		<div
			className="px-8 py-8 md:px-14"
			style={{ background: "oklch(0.97 0.008 80)", minHeight: "100dvh" }}
		>
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1
						style={{
							fontFamily: "var(--font-heading)",
							fontWeight: 600,
							fontSize: "1.75rem",
							lineHeight: 1.1,
							letterSpacing: "-0.02em",
							color: "oklch(0.15 0.008 60)"
						}}
					>
						Posts
					</h1>
					<p
						className="text-sm mt-1"
						style={{
							color: "oklch(0.50 0.010 60)",
							fontFamily: "var(--font-sans)"
						}}
					>
						Manage your breakdowns
					</p>
				</div>
				<Link
					to="/creator/$id"
					params={{ id: "new" }}
					className="px-4 py-2 rounded-md text-sm font-medium"
					style={{
						background: "oklch(0.62 0.14 47)",
						color: "oklch(0.97 0.008 80)",
						fontFamily: "var(--font-sans)"
					}}
				>
					New post
				</Link>
			</div>

			<Suspense fallback={<TableSkeleton />}>
				<PostsTable />
			</Suspense>
		</div>
	);
}
