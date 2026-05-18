import { Button, Textarea, Badge, Card } from "@workspace/ui";
import { HugeiconsIcon } from "@hugeicons/react";
import { Brain01Icon, StopIcon, SentIcon } from "@hugeicons/core-free-icons";
import { cn } from "@workspace/ui/lib/cn";
import React from "react";

interface ChatInputProps {
	input: string;
	setInput: (value: string) => void;
	send: () => void;
	isStreaming: boolean;
	connected: boolean;
	handleStop: () => void;
	textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export function ChatInput({
	input,
	setInput,
	send,
	isStreaming,
	connected,
	handleStop,
	textareaRef
}: ChatInputProps) {
	return (
		<div className="relative z-20 pb-8 px-6 bg-linear-to-t from-background via-background to-transparent">
			<form
				onSubmit={(e) => {
					e.preventDefault();
					send();
				}}
				className="max-w-2xl mx-auto"
			>
				<Card
					className={cn(
						"flex flex-col gap-2 p-2 ring-offset-background transition-all duration-300 ring-1 ring-foreground/5",
						isStreaming
							? "border-primary/20 ring-primary/20"
							: "border-border/50 focus-within:border-primary/40 focus-within:ring-primary/20"
					)}
				>
					<Textarea
						ref={textareaRef}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								send();
							}
						}}
						onInput={(e) => {
							const el = e.currentTarget;
							el.style.height = "auto";
							el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
						}}
						placeholder={
							connected
								? "Apa yang ingin kamu ketahui?"
								: "Menunggu koneksi..."
						}
						disabled={!connected || isStreaming}
						rows={1}
						className="block w-full resize-none border-0 shadow-none focus-visible:ring-0 max-h-[200px] min-h-[44px] bg-transparent pt-3.5 pb-2 px-3 text-[13.5px] leading-relaxed placeholder:text-muted-foreground/60 scrollbar-none"
					/>
					<div className="flex items-center justify-between px-2 pt-1 pb-1">
						<div className="flex items-center gap-1">
							<div className="flex flex-row items-center gap-2 p-1 bg-secondary/50 rounded-lg">
								<Badge
									variant="secondary"
									className="font-bold"
								>
									GPT-4O-MINI
								</Badge>
								<span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 translate-y-[0.5px]">
									<HugeiconsIcon
										icon={Brain01Icon}
										className="size-2.5"
									/>
									Agentic
								</span>
							</div>
						</div>
						<div className="flex items-center gap-1.5">
							{isStreaming ? (
								<Button
									type="button"
									variant="secondary"
									size="icon"
									onClick={handleStop}
									className="h-8 w-8 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-300 border border-destructive/20"
								>
									<HugeiconsIcon
										icon={StopIcon}
										className="size-3.5"
									/>
								</Button>
							) : (
								<Button
									type="submit"
									variant="default"
									size="icon"
									disabled={!input.trim() || !connected}
									className={cn(
										"h-8 w-8 rounded-xl transition-all duration-300",
										input.trim() && connected
											? "bg-primary"
											: "bg-muted text-muted-foreground"
									)}
								>
									<HugeiconsIcon
										icon={SentIcon}
										className="size-3.5"
									/>
								</Button>
							)}
						</div>
					</div>
				</Card>
				<div className="mt-3 text-center">
					<p className="text-[10px] text-muted-foreground/50 font-medium">
						AI can make mistakes. Consider checking important
						information.
					</p>
				</div>
			</form>
		</div>
	);
}
