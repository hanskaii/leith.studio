import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(app)/_home/legals/privacy-policy")({
	component: RouteComponent
});

function RouteComponent() {
	return <div>Hello "/(app)/_home/legals/privacy-policy"!</div>;
}
