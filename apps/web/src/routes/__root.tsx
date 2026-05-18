import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts
} from "@tanstack/react-router";
import { DefaultErrorComponent } from "./-components/default-error-component";
import { DefaultNotFoundComponent } from "./-components/default-notfound-component";
import { DefaultPendingComponent } from "./-components/default-pending-components";

export interface RouterAppContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8"
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{
				title: "workspacen.in"
			}
		]
	}),
	errorComponent: DefaultErrorComponent,
	notFoundComponent: DefaultNotFoundComponent,
	pendingComponent: DefaultPendingComponent,
	component: RootComponent
});

function RootComponent() {
	return (
		<RootDocument>
			<Outlet />
		</RootDocument>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
