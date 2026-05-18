import { createFileRoute, redirect } from "@tanstack/react-router";
import { sessionsOptions } from "@/routes/-fn/auth";
import { AppModalProvider } from "@/routes/-components/providers/app-modal-provider";
import { AppLayout } from "@/routes/-components/layouts/app-layout";
import { Gate } from "@workspace/core";
import { z } from "zod";
import { DefaultNotFoundComponent } from "@/routes/-components/default-notfound-component";

const appSearchSchema = z.object({
	modal: z.enum(["settings"]).optional()
});

export const Route = createFileRoute("/(app)/_admin")({
	validateSearch: (search) => appSearchSchema.parse(search),
	notFoundComponent: DefaultNotFoundComponent,
	beforeLoad: async ({ context, location }) => {
		const session = await context.queryClient.fetchQuery({
			...sessionsOptions(),
			staleTime: 0
		});

		if (!session?.user) {
			throw redirect({
				to: "/login",
				search: {
					redirect: location.href
				}
			});
		}

		const result = await Gate.can("admin.access", {
			actor: session.user
		});

		if (!result.allowed) {
			throw redirect({
				to: "/"
			});
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
