import { createFileRoute, Outlet } from "@tanstack/react-router";
import { HomeNav } from "./-components/home-nav";

export const Route = createFileRoute("/(app)/_home")({
	component: HomeLayout
});

function HomeLayout() {
	return (
		<div className="relative flex min-h-[100dvh] w-full flex-col bg-background font-sans text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
			<HomeNav />
			<Outlet />
		</div>
	);
}
