import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Toaster, TooltipProvider } from "@workspace/ui";
import {
	ThemeProvider,
	ThemeScript
} from "../../routes/-components/providers/theme-provider";
import { ModalProvider } from "../../routes/-components/providers/modal-provider";
import { getThemeFromCookie } from "../../routes/-fn/theme";
import appCss from "../../styles.css?url";

export const Route = createFileRoute("/(app)")({
	loader: async () => await getThemeFromCookie(),
	head: () => ({
		links: [
			{
				rel: "stylesheet",
				href: appCss
			}
		]
	}),
	component: AppLayout
});

function AppLayout() {
	const theme = Route.useLoaderData();
	const context = Route.useRouteContext();
	const queryClient = (context as any).queryClient;

	return (
		<>
			<ThemeScript initialTheme={theme} />
			<ThemeProvider initialTheme={theme}>
				<TooltipProvider>
					<ModalProvider>
						<Outlet />
						<Toaster position="top-center" />
						<TanStackDevtools
							config={{
								position: "bottom-right"
							}}
							plugins={[
								{
									name: "Tanstack Router",
									render: <TanStackRouterDevtoolsPanel />
								},
								{
									name: "Tanstack Query",
									render: (
										<ReactQueryDevtoolsPanel
											client={queryClient}
										/>
									)
								}
							]}
						/>
					</ModalProvider>
				</TooltipProvider>
			</ThemeProvider>
		</>
	);
}
