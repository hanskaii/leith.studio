import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Suspense } from "react";
import { Gate } from "@workspace/core";
import { TableSkeleton } from "./-components/table-skeleton";
import { PostsTable } from "./-components/posts-table";

export const Route = createFileRoute("/(app)/_app/creator/")({
	beforeLoad: async ({ context }) => {
		const result = await Gate.can("content.manage", {
			actor: context.session.user
		});
		if (!result.allowed) {
			throw redirect({
				to: "/feed",
				search: { page: 1, type: "all", sort: "newest" }
			});
		}
	},
	component: CreatorDashboardPage
});

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
