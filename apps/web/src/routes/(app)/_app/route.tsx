import { createFileRoute, redirect } from "@tanstack/react-router";
import { sessionsOptions } from "@/routes/-fn/auth";
import { AppModalProvider } from "@/routes/-components/providers/app-modal-provider";
import { AppLayout } from "@/routes/-components/layouts/app-layout";
import { Gate } from "@workspace/core";

import { z } from "zod";

const appSearchSchema = z.object({
	modal: z.enum(["settings"]).optional(),
	tab: z.enum(["profile", "general", "security", "api-keys"]).optional()
});

export const Route = createFileRoute("/(app)/_app")({
	validateSearch: (search) => appSearchSchema.parse(search),
	beforeLoad: async ({ context, location }) => {
		const session = await context.queryClient.fetchQuery({
			...sessionsOptions(),
			staleTime: 0 // always fetch fresh for auth guard
		});

		if (!session?.user) {
			throw redirect({
				to: "/login",
				search: {
					redirect: location.href
				}
			});
		}

		// Account routes (billing, profile, security) are always accessible
		// so the user can manage their subscription even without one
		const isAccountRoute = location.pathname.startsWith("/account");
		if (!isAccountRoute) {
			const result = await Gate.can("app.use", { actor: session.user });
			if (!result.allowed) throw redirect({ to: "/upgrade" });
		}

		return { session };
	},
	component: LayoutComponent
});

function LayoutComponent() {
	return (
		<AppModalProvider>
			<AppLayout />
		</AppModalProvider>
	);
}
