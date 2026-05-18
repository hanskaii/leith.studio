import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useCallback, useState, useEffect, useRef } from "react";
import { useAgent } from "agents/react";
import { useAgentChat, getAgentMessages } from "@cloudflare/ai-chat/react";
import type { UIMessage } from "ai";
import { toast, Spinner } from "@workspace/ui";
import { Day } from "@workspace/core";

import { ChatHeader } from "./-components/chat-header";
import { ChatWelcome } from "./-components/chat-welcome";
import { ChatMessage } from "./-components/chat-message";
import { ChatInput } from "./-components/chat-input";
import { getChatRoomIdFromCookie } from "@/routes/-fn/chat-room";

export const Route = createFileRoute("/(app)/_app/chat/")({
	loader: async () => {
		const roomId = await getChatRoomIdFromCookie();

		// Prefetch initial messages using the built-in Cloudflare Agents API
		// This runs on the server (SSR) so users see history instantly
		const initialMessages = await getAgentMessages({
			host: import.meta.env.VITE_API_URL,
			agent: "chat-agent",
			name: roomId,
			credentials: "include"
		}).catch(() => [] as UIMessage[]);

		return { roomId, initialMessages };
	},
	component: Chat
});

function ChatInner() {
	const [connected, setConnected] = useState(false);
	const [input, setInput] = useState("");
	const [showDebug, setShowDebug] = useState(false);
	const [manualStopped, setManualStopped] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null!);

	const { roomId, initialMessages } = Route.useLoaderData();
	const { session } = Route.useRouteContext();

	const agent = useAgent({
		agent: "chat-agent",
		name: roomId,
		host: import.meta.env.VITE_API_URL,
		prefix: "agents",
		onOpen: useCallback(() => setConnected(true), []),
		onClose: useCallback(() => setConnected(false), []),
		onError: useCallback(
			(error: Event) => console.error("WebSocket error:", error),
			[]
		),
		onMessage: useCallback((message: MessageEvent) => {
			try {
				const data = JSON.parse(String(message.data));
				if (data.type === "scheduled-task") {
					toast.success(
						"Scheduled task completed: " + data.description
					);
				}
			} catch {}
		}, [])
	});

	const {
		messages,
		sendMessage,
		clearHistory,
		addToolApprovalResponse,
		stop,
		status
	} = useAgentChat({
		agent,
		credentials: "include",
		getInitialMessages: async () => initialMessages,
		onToolCall: async (event) => {
			if (
				"addToolOutput" in event &&
				event.toolCall.toolName === "getUserTimezone"
			) {
				event.addToolOutput({
					toolCallId: event.toolCall.toolCallId,
					output: {
						timezone:
							Intl.DateTimeFormat().resolvedOptions().timeZone,
						localTime: Day().format("LT")
					}
				});
			}
		}
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

	const send = useCallback(() => {
		const text = input.trim();
		if (!text || isStreaming) return;
		setInput("");
		sendMessage({ role: "user", parts: [{ type: "text", text }] });
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
		}
	}, [input, isStreaming, sendMessage]);

	const credits = (session?.user as any)?.credits ?? 0;

	return (
		<div className="flex flex-col h-[calc(100vh-4rem)] bg-background text-sm relative overflow-hidden">
			{/* Decorative background element */}
			<div className="absolute top-0 left-0 w-full h-32 bg-linear-to-b from-primary/5 to-transparent pointer-events-none" />

			<ChatHeader
				connected={connected}
				credits={credits}
				onClearHistory={clearHistory}
				showDebug={showDebug}
				onShowDebugChange={setShowDebug}
			/>

			{/* Messages Container */}
			<div className="flex-1 overflow-y-auto scroll-smooth scrollbar-thin">
				<div className="max-w-2xl mx-auto px-6 py-10 space-y-10">
					{messages.length === 0 && (
						<ChatWelcome
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
									showDebug={showDebug}
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

			<ChatInput
				input={input}
				setInput={setInput}
				send={send}
				isStreaming={isStreaming}
				connected={connected}
				handleStop={handleStop}
				textareaRef={textareaRef}
			/>
		</div>
	);
}

function Chat() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center h-[calc(100vh-4rem)] text-muted-foreground flex-col gap-3">
					<Spinner className="size-6" />
					<span className="text-sm">Connecting to agent...</span>
				</div>
			}
		>
			<ChatInner />
		</Suspense>
	);
}
