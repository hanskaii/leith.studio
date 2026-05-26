import { createFileRoute, redirect } from "@tanstack/react-router";
import { Gate } from "@workspace/core";
import { useAgent } from "agents/react";
import { useAgentChat, getAgentMessages } from "@cloudflare/ai-chat/react";
import type { UIMessage } from "ai";
import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { toast, Spinner } from "@workspace/ui";
import { useQueryClient } from "@tanstack/react-query";

import { StudioAgentHeader } from "./-components/studio-agent-header";
import { StudioWelcome } from "./-components/studio-welcome";
import { StudioInput } from "./-components/studio-input";
import { ChatMessage } from "./-components/chat-message";

export const Route = createFileRoute("/(app)/_app/studio/agent/")({
	beforeLoad: async ({ context }) => {
		const result = await Gate.can("content.manage", {
			actor: context.session.user
		});
		if (!result.allowed) {
			throw redirect({
				to: "/feed",
				search: { page: 1, type: "all", sort: "newest" }
			});
		}
	},
	loader: async ({ context }) => {
		const userId = context.session.user.id;

		const initialMessages = await getAgentMessages({
			host: import.meta.env.VITE_API_URL,
			agent: "studio-agent",
			name: userId,
			credentials: "include"
		}).catch(() => [] as UIMessage[]);

		return { userId, initialMessages };
	},
	component: StudioAgentPage
});

function StudioAgentInner() {
	const { userId, initialMessages } = Route.useLoaderData();
	const queryClient = useQueryClient();

	const [connected, setConnected] = useState(false);
	const [input, setInput] = useState("");
	const [manualStopped, setManualStopped] = useState(false);
	const [previewImage, setPreviewImage] = useState<string | null>(null);
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [stats, setStats] = useState({
		activeSchedules: 0,
		inFlightFlows: 0,
		pendingReviews: 0
	});

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null!);

	const agent = useAgent({
		agent: "studio-agent",
		name: userId,
		host: import.meta.env.VITE_API_URL,
		prefix: "agents",
		onOpen: useCallback(() => setConnected(true), []),
		onClose: useCallback(() => setConnected(false), []),
		onError: useCallback(
			(error: Event) => console.error("Studio agent WS error:", error),
			[]
		),
		onMessage: useCallback(
			(message: MessageEvent) => {
				try {
					const data = JSON.parse(String(message.data));
					if (data.type === "stats") {
						setStats(data);
					} else if (data.type === "approve_done") {
						toast.success("Post created as draft");
						queryClient.invalidateQueries({
							queryKey: ["studio-review"]
						});
						queryClient.invalidateQueries({ queryKey: ["posts"] });
					} else if (data.type === "approve_failed") {
						toast.error(
							`Gagal approve: ${data.step} — ${data.error}`
						);
					} else if (data.type === "flow_done") {
						toast.success("Generation selesai: " + data.topic);
						queryClient.invalidateQueries({
							queryKey: ["studio-review"]
						});
					} else if (data.type === "flow_skipped") {
						toast.warning("Flow skipped: " + data.reason);
					} else if (data.type === "flow_failed") {
						toast.error(
							`Flow gagal di ${data.stepType}: ${data.error}`
						);
					}
				} catch {}
			},
			[queryClient]
		)
	});

	const { messages, sendMessage, stop, status } = useAgentChat({
		agent,
		credentials: "include",
		getInitialMessages: async () => initialMessages
	});

	const isStreaming =
		!manualStopped && (status === "streaming" || status === "submitted");

	useEffect(() => {
		if (status === "streaming" || status === "submitted") {
			setManualStopped(false);
		}
	}, [status]);

	const handleStop = useCallback(() => {
		stop();
		setManualStopped(true);
	}, [stop]);

	const isInitialLoad = useRef(true);
	useEffect(() => {
		if (messages.length === 0) return;
		if (isInitialLoad.current) {
			messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
			isInitialLoad.current = false;
		} else {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages]);

	useEffect(() => {
		if (!isStreaming && textareaRef.current) {
			textareaRef.current.focus();
		}
	}, [isStreaming]);

	// Clean up preview URL on unmount
	useEffect(() => {
		return () => {
			if (previewImage) URL.revokeObjectURL(previewImage);
		};
	}, [previewImage]);

	const handleImageFile = useCallback((file: File) => {
		setPreviewImage((prev) => {
			if (prev) URL.revokeObjectURL(prev);
			return URL.createObjectURL(file);
		});
		setImageFile(file);
	}, []);

	const handleClearImage = useCallback(() => {
		setPreviewImage((prev) => {
			if (prev) URL.revokeObjectURL(prev);
			return null;
		});
		setImageFile(null);
	}, []);

	const send = useCallback(async () => {
		if (!input.trim() && !imageFile) return;
		if (isStreaming) return;

		const parts: any[] = [];
		if (input.trim()) parts.push({ type: "text", text: input.trim() });

		if (imageFile) {
			const base64 = await new Promise<string>((resolve) => {
				const reader = new FileReader();
				reader.onload = (e) => resolve(e.target?.result as string);
				reader.readAsDataURL(imageFile);
			});
			parts.push({ type: "image", image: base64 });
		}

		setInput("");
		handleClearImage();
		if (textareaRef.current) textareaRef.current.style.height = "auto";

		sendMessage({ role: "user", parts });
	}, [input, imageFile, isStreaming, sendMessage, handleClearImage]);

	// noop — studio agent doesn't use client-side tool approval
	const addToolApprovalResponse = useCallback(() => {}, []);

	return (
		<div className="flex flex-col h-[calc(100vh-4rem)] bg-background text-sm relative overflow-hidden">
			<div className="absolute top-0 left-0 w-full h-32 bg-linear-to-b from-primary/5 to-transparent pointer-events-none" />

			<StudioAgentHeader connected={connected} stats={stats} />

			{/* Messages */}
			<div className="flex-1 overflow-y-auto scroll-smooth scrollbar-thin">
				<div className="max-w-2xl mx-auto px-6 py-10 space-y-10">
					{messages.length === 0 && (
						<StudioWelcome
							isStreaming={isStreaming}
							onSendMessage={(text) =>
								sendMessage({
									role: "user",
									parts: [{ type: "text", text }]
								})
							}
						/>
					)}

					<div className="flex flex-col gap-10">
						{messages.map((message: UIMessage, index: number) => {
							const isLastAssistant =
								message.role === "assistant" &&
								index === messages.length - 1;
							return (
								<ChatMessage
									key={message.id}
									message={message}
									isLastAssistant={isLastAssistant}
									isStreaming={isStreaming}
									showDebug={false}
									addToolApprovalResponse={
										addToolApprovalResponse
									}
								/>
							);
						})}
					</div>

					<div ref={messagesEndRef} className="h-4" />
				</div>
			</div>

			<StudioInput
				input={input}
				setInput={setInput}
				send={send}
				isStreaming={isStreaming}
				connected={connected}
				handleStop={handleStop}
				textareaRef={textareaRef}
				previewImage={previewImage}
				onImageFile={handleImageFile}
				onClearImage={handleClearImage}
			/>
		</div>
	);
}

function StudioAgentPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center h-[calc(100vh-4rem)] text-muted-foreground flex-col gap-3">
					<Spinner className="size-6" />
					<span className="text-sm">
						Connecting to studio agent...
					</span>
				</div>
			}
		>
			<StudioAgentInner />
		</Suspense>
	);
}
