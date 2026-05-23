import { Button, Textarea, Badge, Card } from "@workspace/ui";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	StopIcon,
	SentIcon,
	Image01Icon,
	Cancel01Icon,
	VideoReplayIcon
} from "@hugeicons/core-free-icons";
import { cn } from "@workspace/ui/lib/cn";
import React, { useRef } from "react";

interface StudioInputProps {
	input: string;
	setInput: (value: string) => void;
	send: () => void;
	isStreaming: boolean;
	connected: boolean;
	handleStop: () => void;
	textareaRef: React.RefObject<HTMLTextAreaElement>;
	previewImage: string | null;
	onImageFile: (file: File) => void;
	onClearImage: () => void;
}

export function StudioInput({
	input,
	setInput,
	send,
	isStreaming,
	connected,
	handleStop,
	textareaRef,
	previewImage,
	onImageFile,
	onClearImage
}: StudioInputProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
		const items = e.clipboardData?.items;
		if (!items) return;
		for (let i = 0; i < items.length; i++) {
			if (items[i].type.startsWith("image/")) {
				const file = items[i].getAsFile();
				if (file) {
					e.preventDefault();
					onImageFile(file);
					break;
				}
			}
		}
	};

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
					{/* Image preview */}
					{previewImage && (
						<div className="px-3 pt-2">
							<div className="relative inline-block">
								<img
									src={previewImage}
									alt="Preview"
									className="h-20 w-auto rounded-lg object-cover border border-border/50"
								/>
								<button
									type="button"
									onClick={onClearImage}
									className="absolute -top-1.5 -right-1.5 bg-background border border-border/50 rounded-full p-0.5 hover:bg-destructive hover:border-destructive hover:text-white transition-colors"
								>
									<HugeiconsIcon
										icon={Cancel01Icon}
										className="size-3"
									/>
								</button>
							</div>
						</div>
					)}

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
						onPaste={handlePaste}
						placeholder={
							connected
								? "Ceritakan apa yang ingin dibuat..."
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
									STUDIO
								</Badge>
								<span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 translate-y-[0.5px]">
									<HugeiconsIcon
										icon={VideoReplayIcon}
										className="size-2.5"
									/>
									Generative
								</span>
							</div>

							{/* Image attach */}
							<input
								type="file"
								accept="image/*"
								className="hidden"
								ref={fileInputRef}
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) onImageFile(file);
									e.target.value = "";
								}}
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								disabled={!connected || isStreaming}
								onClick={() => fileInputRef.current?.click()}
								className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
							>
								<HugeiconsIcon
									icon={Image01Icon}
									className="size-3.5"
								/>
							</Button>
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
									disabled={
										(!input.trim() && !previewImage) ||
										!connected
									}
									className={cn(
										"h-8 w-8 rounded-xl transition-all duration-300",
										(input.trim() || previewImage) &&
											connected
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
						AI dapat membuat kesalahan. Selalu review sebelum
						publish.
					</p>
				</div>
			</form>
		</div>
	);
}
