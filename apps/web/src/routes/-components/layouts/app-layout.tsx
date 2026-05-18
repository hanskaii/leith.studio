import { Outlet, useRouteContext } from "@tanstack/react-router";
import { Toaster } from "@workspace/ui";
import { AppNavigation } from "./app-navigation";

export function AppLayout() {
	// Safely retrieve the context which includes session data
	const context = useRouteContext({ strict: false }) as any;
	const user = context?.session?.user;

	return (
		<div className="mx-auto w-full max-w-3xl min-h-screen bg-background flex flex-col">
			<AppNavigation user={user} />
			<main className="flex-1 p-6">
				<Outlet />
			</main>
			<Toaster position="top-center" />
		</div>
	);
}
