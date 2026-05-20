import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { Gate } from "@workspace/core";
import { SettingsContent } from "./-components/settings-content";
import { SettingsSkeleton } from "./-components/settings-skeleton";

export const Route = createFileRoute("/(app)/_app/studio/settings/")({
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
	component: SettingsPage
});

function SettingsPage() {
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
						Studio settings
					</h1>
					<p
						className="text-sm mt-1"
						style={{
							color: "oklch(0.50 0.010 60)",
							fontFamily: "var(--font-sans)"
						}}
					>
						Global defaults for auto-generation
					</p>
				</div>
				<Link
					to="/studio/topics"
					className="px-3 py-2 rounded-md text-sm"
					style={{
						background: "oklch(0.92 0.008 80)",
						color: "oklch(0.30 0.008 60)"
					}}
				>
					Topics
				</Link>
			</div>

			<Suspense fallback={<SettingsSkeleton />}>
				<SettingsContent />
			</Suspense>
		</div>
	);
}
