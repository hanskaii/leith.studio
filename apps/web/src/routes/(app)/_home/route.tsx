import { createFileRoute, Outlet } from "@tanstack/react-router";
import { HomeNav } from "./-components/home-nav";
import { SearchDialog } from "./-components/search-dialog";

export const Route = createFileRoute("/(app)/_home")({
	component: HomeLayout
});

function HomeLayout() {
	return (
		<div className="relative flex min-h-[100dvh] w-full flex-col bg-background font-sans text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
			<HomeNav />
			<Outlet />
			<SearchDialog />
			<div className="fixed bottom-4 right-4 z-50">
				<a
					target="_blank"
					rel="noopener noreferrer"
					href="https://tanship.dev"
					className="group/button inline-flex shrink-0 items-center justify-center bg-clip-padding font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 h-7 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5 border border-border px-4 py-4 rounded-md gap-2"
				>
					<span>Built with</span>
					<img
						src="https://tanship.dev/logo.avif"
						className="size-5"
					/>
					<span className="font-semibold">Tanship</span>
				</a>
			</div>
		</div>
	);
}
