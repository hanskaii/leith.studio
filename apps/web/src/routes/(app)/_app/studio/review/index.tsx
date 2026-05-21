import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { Gate } from "@workspace/core";
import { ReviewGrid } from "./-components/review-grid";
import { ReviewGridSkeleton } from "./-components/review-grid-skeleton";

export const Route = createFileRoute("/(app)/_app/studio/review/")({
	beforeLoad: async ({ context }) => {
		const result = await Gate.can("content.manage", {
			actor: (context as any).session.user
		});
		if (!result.allowed) {
			throw redirect({
				to: "/feed",
				search: { page: 1, type: "all", sort: "newest" }
			});
		}
	},
	component: ReviewPage
});

function ReviewPage() {
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
						Review
					</h1>
					<p
						className="text-sm mt-1"
						style={{
							color: "oklch(0.50 0.010 60)",
							fontFamily: "var(--font-sans)"
						}}
					>
						Pick and approve generated backgrounds
					</p>
				</div>
				<Link
					to="/studio/agent"
					className="px-3 py-2 rounded-md text-sm"
					style={{
						background: "oklch(0.92 0.008 80)",
						color: "oklch(0.30 0.008 60)"
					}}
				>
					Agent
				</Link>
			</div>

			<Suspense fallback={<ReviewGridSkeleton />}>
				<ReviewGrid />
			</Suspense>
		</div>
	);
}
