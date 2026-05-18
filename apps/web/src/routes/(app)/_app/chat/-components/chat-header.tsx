import { Button, Toggle } from "@workspace/ui";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Brain01Icon,
	Coins01Icon,
	Delete02Icon,
	Bug01Icon
} from "@hugeicons/core-free-icons";
import { cn } from "@workspace/ui/lib/cn";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger
} from "@workspace/ui";

interface ChatHeaderProps {
	connected: boolean;
	credits: number;
	onClearHistory: () => void;
	showDebug: boolean;
	onShowDebugChange: (show: boolean) => void;
}

export function ChatHeader({
	connected,
	credits,
	onClearHistory,
	showDebug,
	onShowDebugChange
}: ChatHeaderProps) {
	return (
		<TooltipProvider>
			<header className="sticky top-0 z-30 px-5 py-3 bg-background/80 backdrop-blur-md border-b border-border/50 flex items-center justify-between transition-all">
				<div className="flex items-center gap-3">
					<div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
						<HugeiconsIcon
							icon={Brain01Icon}
							className="size-4 text-primary"
						/>
					</div>
					<div className="flex flex-col">
						<h1 className="text-sm font-semibold tracking-tight text-foreground leading-none">
							AI Assistant
						</h1>
						<div className="flex items-center gap-1.5 mt-1">
							<span
								className={cn(
									"w-1.5 h-1.5 rounded-full",
									connected
										? "bg-emerald-500 animate-pulse"
										: "bg-destructive"
								)}
							></span>
							<span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
								{connected ? "Live" : "Offline"}
							</span>
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<div className="flex items-center p-1 bg-secondary/50 rounded-lg border border-border/50">
						<div className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-400/10 border border-yellow-400/20 rounded-md mr-1">
							<HugeiconsIcon
								icon={Coins01Icon}
								className="size-3 text-yellow-500"
							/>
							<span className="text-[10px] font-black text-yellow-600 dark:text-yellow-400 tabular-nums">
								{credits.toLocaleString()}
							</span>
						</div>
						<div className="w-[1px] h-4 bg-border mx-1" />

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									onClick={onClearHistory}
									className="size-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
								>
									<HugeiconsIcon
										icon={Delete02Icon}
										className="size-3.5"
									/>
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom" className="text-xs">
								Clear Chat
							</TooltipContent>
						</Tooltip>

						<div className="w-[1px] h-4 bg-border mx-1" />

						<Tooltip>
							<TooltipTrigger asChild>
								<Toggle
									pressed={showDebug}
									onPressedChange={onShowDebugChange}
									className="size-7 p-0 rounded-md data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
								>
									<HugeiconsIcon
										icon={Bug01Icon}
										className="size-3.5"
									/>
								</Toggle>
							</TooltipTrigger>
							<TooltipContent side="bottom" className="text-xs">
								Debug Mode
							</TooltipContent>
						</Tooltip>
					</div>
				</div>
			</header>
		</TooltipProvider>
	);
}
