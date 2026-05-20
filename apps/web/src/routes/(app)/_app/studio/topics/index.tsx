import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense, useContext } from "react";
import { Gate } from "@workspace/core";
import { AppModalContext } from "@/routes/-components/providers/app-modal-provider";
import { TopicsTable } from "./-components/topics-table";
import { TopicsTableSkeleton } from "./-components/topics-table-skeleton";

export const Route = createFileRoute("/(app)/_app/studio/topics/")({
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
	component: TopicsPage
});

function TopicsPage() {
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
						Topics
					</h1>
					<p
						className="text-sm mt-1"
						style={{
							color: "oklch(0.50 0.010 60)",
							fontFamily: "var(--font-sans)"
						}}
					>
						Auto-generate background assets from topics
					</p>
				</div>
				<div className="flex gap-2">
					<a
						href="/studio/settings"
						className="px-3 py-2 rounded-md text-sm"
						style={{
							background: "oklch(0.92 0.008 80)",
							color: "oklch(0.30 0.008 60)"
						}}
					>
						Settings
					</a>
					<a
						href="/studio/review"
						className="px-3 py-2 rounded-md text-sm"
						style={{
							background: "oklch(0.92 0.008 80)",
							color: "oklch(0.30 0.008 60)"
						}}
					>
						Review
					</a>
				</div>
			</div>

			<Suspense fallback={<TopicsTableSkeleton />}>
				<TopicsTableWithAdd />
			</Suspense>
		</div>
	);
}

function TopicsTableWithAdd() {
	const { openTopicModal } = useContext(AppModalContext);

	return (
		<>
			<div className="flex justify-end mb-3">
				<button
					onClick={() => openTopicModal()}
					className="px-4 py-2 rounded-md text-sm font-medium"
					style={{
						background: "oklch(0.62 0.14 47)",
						color: "oklch(0.97 0.008 80)"
					}}
				>
					Add topic
				</button>
			</div>
			<TopicsTable />
		</>
	);
}
