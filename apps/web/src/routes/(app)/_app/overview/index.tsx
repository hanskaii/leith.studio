import { createFileRoute } from "@tanstack/react-router";
import { AdminOverview } from "./-components/admin-overview";
import { CreatorOverviewPlaceholder } from "./-components/creator-overview-placeholder";

export const Route = createFileRoute("/(app)/_app/overview/")({
	component: OverviewPage
});

function OverviewPage() {
	const { session } = Route.useRouteContext();
	const isAdmin = session?.user?.role === "admin";

	return isAdmin ? <AdminOverview /> : <CreatorOverviewPlaceholder />;
}
