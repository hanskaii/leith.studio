import { Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	VideoReplayIcon,
	Loading03Icon,
	CheckmarkCircle01Icon,
	TimeScheduleIcon
} from "@hugeicons/core-free-icons";
import { cn } from "@workspace/ui/lib/cn";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from "@workspace/ui";

interface StudioAgentHeaderProps {
	connected: boolean;
	stats: {
		activeSchedules: number;
		inFlightFlows: number;
		pendingReviews: number;
	};
}

export function StudioAgentHeader({
	connected,
	stats
}: StudioAgentHeaderProps) {
	return (
		<TooltipProvider>
			<header className="sticky top-0 z-30 px-5 py-3 bg-background/80 backdrop-blur-md border-b border-border/50 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
						<HugeiconsIcon
							icon={VideoReplayIcon}
							className="size-4 text-primary"
						/>
					</div>
					<div className="flex flex-col">
						<h1 className="text-sm font-semibold tracking-tight text-foreground leading-none">
							Studio Agent
						</h1>
						<div className="flex items-center gap-1.5 mt-1">
							<span
								className={cn(
									"w-1.5 h-1.5 rounded-full",
									connected
										? "bg-emerald-500 animate-pulse"
										: "bg-destructive"
								)}
							/>
							<span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
								{connected ? "Live" : "Offline"}
							</span>
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-lg border border-border/50">
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-400/10 border border-blue-400/20 rounded-md">
									<HugeiconsIcon
										icon={TimeScheduleIcon}
										className="size-3 text-blue-500"
									/>
									<span className="text-[10px] font-black text-blue-600 dark:text-blue-400 tabular-nums">
										{stats.activeSchedules}
									</span>
								</div>
							</TooltipTrigger>
							<TooltipContent side="bottom" className="text-xs">
								Active Schedules
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-400/10 border border-orange-400/20 rounded-md">
									<HugeiconsIcon
										icon={Loading03Icon}
										className="size-3 text-orange-500"
									/>
									<span className="text-[10px] font-black text-orange-600 dark:text-orange-400 tabular-nums">
										{stats.inFlightFlows}
									</span>
								</div>
							</TooltipTrigger>
							<TooltipContent side="bottom" className="text-xs">
								In-Flight Generations
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-400/10 border border-emerald-400/20 rounded-md">
									<HugeiconsIcon
										icon={CheckmarkCircle01Icon}
										className="size-3 text-emerald-500"
									/>
									<span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
										{stats.pendingReviews}
									</span>
								</div>
							</TooltipTrigger>
							<TooltipContent side="bottom" className="text-xs">
								Pending Reviews
							</TooltipContent>
						</Tooltip>
					</div>

					<Button
						variant="outline"
						size="sm"
						asChild
						className="h-8 text-xs rounded-lg"
					>
						<Link to="/studio/review">Review</Link>
					</Button>
				</div>
			</header>
		</TooltipProvider>
	);
}
