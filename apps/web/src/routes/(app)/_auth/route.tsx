import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { sessionsOptions } from "@/routes/-fn/auth";
import { appConfig } from "@workspace/config";

export const Route = createFileRoute("/(app)/_auth")({
	beforeLoad: async ({ context }) => {
		const session = await context.queryClient.fetchQuery({
			...sessionsOptions(),
			staleTime: 0
		});

		if (session?.user) {
			throw redirect({
				to: appConfig.authDefaultRedirect
			});
		}
		return {
			session
		};
	},
	component: AuthLayout
});

function AuthLayout() {
	return (
		<div className="auth-layout">
			<Outlet />
		</div>
	);
}
