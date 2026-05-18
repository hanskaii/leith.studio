import { Button } from "@workspace/ui";
import { HugeiconsIcon } from "@hugeicons/react";
import { Brain01Icon } from "@hugeicons/core-free-icons";

interface ChatWelcomeProps {
	isStreaming: boolean;
	onSendMessage: (text: string) => void;
}

export function ChatWelcome({ isStreaming, onSendMessage }: ChatWelcomeProps) {
	return (
		<div className="flex flex-col items-center justify-center py-12 text-center space-y-8 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500">
			<div className="relative">
				<div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
				<div className="relative w-24 h-24 rounded-[2rem] bg-linear-to-br from-primary to-primary-foreground flex items-center justify-center transform rotate-3">
					<HugeiconsIcon
						icon={Brain01Icon}
						className="size-12 text-white -rotate-3"
						strokeWidth={1.5}
					/>
				</div>
			</div>
			<div className="space-y-3">
				<h2 className="text-3xl font-heading font-bold tracking-tight text-foreground">
					How can I help you?
				</h2>
				<p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
					I'm your AI assistant, capable of checking weather, managing
					tasks, and helping you build amazing things.
				</p>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg pt-4">
				{[
					{
						label: "Weather Check",
						text: "What's the weather like in Tokyo?",
						icon: "⛅"
					},
					{
						label: "Local Time",
						text: "What time is it now?",
						icon: "⌚"
					},
					{
						label: "Calculator",
						text: "Calculate 1500 * 25 for me",
						icon: "🔢"
					},
					{
						label: "Reminders",
						text: "Remind me to drink water in 5 minutes",
						icon: "⏰"
					}
				].map((item, i) => (
					<div
						key={item.label}
						className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
						style={{
							animationDelay: `${150 + i * 100}ms`
						}}
					>
						<Button
							variant="outline"
							disabled={isStreaming}
							onClick={() => onSendMessage(item.text)}
							className="group w-full flex items-center justify-start gap-3 h-auto p-3.5 text-left border-border/40 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 rounded-2xl bg-card/30 backdrop-blur-sm"
						>
							<span className="text-xl bg-secondary/80 size-11 rounded-xl flex items-center justify-center group-hover:bg-primary/10 group-hover:scale-110 transition-transform">
								{item.icon}
							</span>
							<div className="flex flex-col">
								<span className="text-xs font-bold text-foreground">
									{item.label}
								</span>
								<span className="text-[10px] text-muted-foreground line-clamp-1 group-hover:text-primary/70">
									{item.text}
								</span>
							</div>
						</Button>
					</div>
				))}
			</div>
		</div>
	);
}
