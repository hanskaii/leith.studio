import { isToolUIPart } from "ai";
import type { UIMessage } from "ai";
import { HugeiconsIcon } from "@hugeicons/react";
import { Brain01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@workspace/ui/lib/cn";
import { Streamdown } from "streamdown";
import { ToolPartView } from "./tool-part-view";
import {
	Avatar,
	AvatarFallback,
	Card,
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from "@workspace/ui";

interface ChatMessageProps {
	message: UIMessage;
	isLastAssistant: boolean;
	isStreaming: boolean;
	showDebug: boolean;
	addToolApprovalResponse: (response: {
		id: string;
		approved: boolean;
	}) => void;
}

export function ChatMessage({
	message,
	isLastAssistant,
	isStreaming,
	showDebug,
	addToolApprovalResponse
}: ChatMessageProps) {
	const isUser = message.role === "user";

	return (
		<div
			className={cn(
				"group flex flex-col space-y-2 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300",
				isUser ? "items-end" : "items-start"
			)}
		>
			{showDebug && (
				<pre className="w-full text-[10px] text-muted-foreground bg-secondary/50 rounded-xl p-4 overflow-auto max-h-64 font-mono border border-border/50">
					{JSON.stringify(message, null, 2)}
				</pre>
			)}

			{/* Tool parts */}
			{message.parts.filter(isToolUIPart).map((part) => (
				<ToolPartView
					key={part.toolCallId}
					part={part}
					addToolApprovalResponse={addToolApprovalResponse}
				/>
			))}

			{/* Reasoning parts */}
			{message.parts
				.filter(
					(part) =>
						part.type === "reasoning" &&
						(part as { text?: string }).text?.trim()
				)
				.map((part, i) => {
					const reasoning = part as {
						type: "reasoning";
						text: string;
						state?: "streaming" | "done";
					};
					const isDone = reasoning.state === "done" || !isStreaming;
					return (
						<div key={i} className="flex justify-start w-full">
							<Collapsible
								className="w-full group/reasoning"
								defaultOpen={!isDone}
							>
								<CollapsibleTrigger className="flex items-center gap-2 cursor-pointer py-1 text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors select-none list-none [&[data-state=open]_.arrow-icon]:rotate-180">
									<div className="flex items-center gap-2 px-2 py-0.5 rounded bg-secondary/80 border border-border/50">
										<HugeiconsIcon
											icon={Brain01Icon}
											className={cn(
												"size-3",
												!isDone &&
													"animate-pulse text-primary"
											)}
										/>
										<span>
											{isDone
												? "Thought Process"
												: "Thinking..."}
										</span>
										<HugeiconsIcon
											icon={ArrowDown01Icon}
											className="size-3 transition-transform arrow-icon"
										/>
									</div>
								</CollapsibleTrigger>
								<CollapsibleContent>
									<div className="mt-2 pl-3 border-l-2 border-primary/20 bg-secondary/20 rounded-r-lg py-2 px-3 text-[11px] text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap">
										{reasoning.text}
									</div>
								</CollapsibleContent>
							</Collapsible>
						</div>
					);
				})}

			{/* Text parts */}
			{message.parts
				.filter((part) => part.type === "text")
				.map((part, i) => {
					const text = (
						part as {
							type: "text";
							text: string;
						}
					).text;
					if (!text) return null;

					if (isUser) {
						return (
							<div
								key={i}
								className="flex flex-col items-end max-w-[85%] group/user"
							>
								<div className="px-4 py-2.5 rounded-2xl rounded-tr-sm bg-primary text-primary-foreground">
									<p className="text-[13px] font-medium leading-relaxed whitespace-pre-wrap">
										{text}
									</p>
								</div>
								<span className="mt-1 mr-1 text-[9px] font-medium text-muted-foreground opacity-0 group-hover/user:opacity-100 transition-opacity">
									Delivered
								</span>
							</div>
						);
					}

					return (
						<div
							key={i}
							className="flex flex-col items-start w-full gap-2"
						>
							<div className="flex items-center gap-2 mb-1">
								<Avatar className="size-6 border border-primary/20 bg-primary/10">
									<AvatarFallback className="bg-transparent text-primary">
										<HugeiconsIcon
											icon={Brain01Icon}
											className="size-3.5"
										/>
									</AvatarFallback>
								</Avatar>
								<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
									Assistant
								</span>
							</div>
							<Card className="max-w-[90%] overflow-hidden py-0 gap-0 border-border/40 text-foreground leading-relaxed ring-1 ring-foreground/5">
								<Streamdown
									className="sd-theme prose prose-sm dark:prose-invert max-w-none prose-p:my-0 prose-p:py-3 prose-p:px-4 prose-pre:my-0 prose-pre:rounded-none prose-pre:bg-secondary/50 dark:prose-pre:bg-secondary/20 prose-code:text-primary dark:prose-code:text-primary-foreground/90 prose-headings:px-4 prose-headings:pt-3 prose-ul:px-8 prose-ol:px-8 font-sans"
									controls={false}
									isAnimating={isLastAssistant && isStreaming}
								>
									{text}
								</Streamdown>
							</Card>
						</div>
					);
				})}
		</div>
	);
}
