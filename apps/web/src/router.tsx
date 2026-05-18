import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";
import { boot } from "./boot";

boot();

const DEFAULT_STALE_TIME = 1000 * 60 * 5;

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: DEFAULT_STALE_TIME,
			refetchOnWindowFocus: false
		}
	}
});

export const getRouter = () => {
	const router = createRouter({
		routeTree,
		scrollRestoration: true,
		context: { queryClient }
	});

	setupRouterSsrQueryIntegration({
		router,
		queryClient
	});

	return router;
};

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
