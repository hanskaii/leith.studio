import { Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";

export function StudioAgentHeader({
	stats
}: {
	stats: {
		activeSchedules: number;
		inFlightFlows: number;
		pendingReviews: number;
	};
}) {
	return (
		<div className="flex items-center justify-between border-b p-4">
			<div className="flex items-center space-x-4 text-sm text-muted-foreground">
				<span>Active Schedules: {stats.activeSchedules}</span>
				<span>In-flight: {stats.inFlightFlows}</span>
				<span>Pending Reviews: {stats.pendingReviews}</span>
			</div>
			<Button variant="outline" asChild>
				<Link to="/studio/review">View Reviews</Link>
			</Button>
		</div>
	);
}
