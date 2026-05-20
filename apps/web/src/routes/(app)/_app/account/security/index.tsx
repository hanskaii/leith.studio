import { createFileRoute, redirect } from "@tanstack/react-router";
import { Button, Separator, toast, Field, FieldLabel } from "@workspace/ui";
import { Gate } from "@workspace/core";
import { useLogoutMutation } from "@/routes/-fn/auth";
import { SecurityPageContent } from "./-components/security-page-content";
import { SecuritySkeleton } from "./-components/session-skeleton";

import { Suspense } from "react";

export const Route = createFileRoute("/(app)/_app/account/security/")({
	beforeLoad: async ({ context }) => {
		const result = await Gate.can("security.manage", {
			actor: context.session.user
		});

		if (!result.allowed) {
			setTimeout(() => toast.error(result.message || "Access denied"), 0);
			throw redirect({ to: "/overview" });
		}
	},
	component: SecurityPage
});

function SecurityPage() {
	const { logout, isPending: isLogoutPending } = useLogoutMutation();
	const { session } = Route.useRouteContext();

	return (
		<div className="flex flex-col gap-10 w-full mt-2 pb-10">
			<Suspense fallback={<SecuritySkeleton />}>
				<SecurityPageContent session={session?.session} />
			</Suspense>

			<Separator />

			{/* LOGOUT ACTIONS */}
			<section className="flex flex-col gap-6">
				<Field orientation="horizontal">
					<div className="flex flex-col gap-1.5 flex-1 pr-4 pt-1">
						<FieldLabel className="text-sm font-medium text-foreground">
							Log out of this device
						</FieldLabel>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="secondary"
							onClick={() => logout()}
							disabled={isLogoutPending}
						>
							{isLogoutPending ? "Logging out..." : "Log out"}
						</Button>
					</div>
				</Field>
			</section>
		</div>
	);
}
