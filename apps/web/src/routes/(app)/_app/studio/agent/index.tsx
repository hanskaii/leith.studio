import { createFileRoute, redirect } from "@tanstack/react-router";
import { Gate } from "@workspace/core";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import { StudioAgentHeader } from "./-components/studio-agent-header";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";

export const Route = createFileRoute("/(app)/_app/studio/agent/")({
	beforeLoad: ({ context }) => {
		if (!Gate.can("content.manage", { actor: context.session.user })) {
			throw redirect({
				to: "/feed",
				search: { page: 1, type: "all", sort: "newest" }
			});
		}
	},
	loader: ({ context }) => {
		return { userId: context.session.user.id };
	},
	component: StudioAgentPage
});

function StudioAgentPage() {
	const { userId } = Route.useLoaderData();
	const queryClient = useQueryClient();
	const [stats, setStats] = useState({
		activeSchedules: 0,
		inFlightFlows: 0,
		pendingReviews: 0
	});

	const agent = useAgent({
		agent: "studio-agent",
		name: userId,
		host: import.meta.env.VITE_API_URL,
		prefix: "agents",
		onMessage: (message: any) => {
			const data = message;
			if (data.type === "flow_progress") {
				// We could update local state for inline progress, but simple toasts/messages might be enough
			} else if (data.type === "approve_started") {
				toast.info("Memproses approval...");
			} else if (data.type === "approve_done") {
				toast.success("Post created");
				queryClient.invalidateQueries({ queryKey: ["studio-review"] });
				queryClient.invalidateQueries({ queryKey: ["posts"] });
			} else if (data.type === "approve_failed") {
				toast.error(`Gagal approve: ${data.step} - ${data.error}`);
			} else if (data.type === "flow_done") {
				toast.success("Generation complete: " + data.topic);
				queryClient.invalidateQueries({ queryKey: ["studio-review"] });
			} else if (data.type === "flow_skipped") {
				toast.warning("Flow skipped: " + data.reason);
			} else if (data.type === "flow_failed") {
				toast.error(`Flow failed at ${data.stepType}: ${data.error}`);
			} else if (data.type === "stats") {
				setStats(data);
			}
		}
	});

	const chat = useAgentChat({
		agent,
		credentials: "include"
	}) as any;

	const fileInputRef = useRef<HTMLInputElement>(null);
	const [previewImage, setPreviewImage] = useState<string | null>(null);
	const [imageFile, setImageFile] = useState<File | null>(null);

	const handleImageFile = (file: File) => {
		const objectUrl = URL.createObjectURL(file);
		setPreviewImage(objectUrl);
		setImageFile(file);
	};

	useEffect(() => {
		return () => {
			if (previewImage) {
				URL.revokeObjectURL(previewImage);
			}
		};
	}, [previewImage]);

	const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			handleImageFile(file);
		}
	};

	const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
		const items = e.clipboardData?.items;
		if (!items) return;

		for (let i = 0; i < items.length; i++) {
			if (items[i].type.indexOf("image") !== -1) {
				const file = items[i].getAsFile();
				if (file) {
					e.preventDefault();
					handleImageFile(file);
					break;
				}
			}
		}
	};

	const onFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!chat.input && !previewImage) return;

		const content: any = [];
		if (chat.input) {
			content.push({ type: "text", text: chat.input });
		}

		if (imageFile) {
			// Convert to base64 just before sending so the backend can read it
			const reader = new FileReader();
			const base64Promise = new Promise<string>((resolve) => {
				reader.onload = (e) => resolve(e.target?.result as string);
				reader.readAsDataURL(imageFile);
			});
			const base64 = await base64Promise;
			content.push({ type: "image", image: base64 });
		}

		chat.append({
			role: "user",
			content:
				content.length === 1 && content[0].type === "text"
					? chat.input
					: content
		});
		chat.handleInputChange({ target: { value: "" } } as any);
		setPreviewImage(null);
		setImageFile(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	return (
		<div className="flex h-[calc(100vh-4rem)] flex-col">
			<StudioAgentHeader stats={stats} />
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{chat.messages.length === 0 && (
					<div className="text-center text-muted-foreground pt-12">
						Welcome to Leith Studio Agent! How can I help you today?
					</div>
				)}
				{chat.messages?.map((m: any) => (
					<div
						key={m.id || m.createdAt || Math.random().toString()}
						className={`p-4 rounded-lg max-w-[80%] ${m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "mr-auto bg-muted"}`}
					>
						<p className="whitespace-pre-wrap">{m.content}</p>
					</div>
				))}
			</div>
			<div className="p-4 border-t flex flex-col gap-2">
				{previewImage && (
					<div className="relative w-24 h-24">
						<img
							src={previewImage}
							alt="Preview"
							className="w-full h-full object-cover rounded-md"
						/>
						<button
							onClick={() => {
								setPreviewImage(null);
								setImageFile(null);
								if (fileInputRef.current)
									fileInputRef.current.value = "";
							}}
							className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
						>
							×
						</button>
					</div>
				)}
				<form onSubmit={onFormSubmit} className="flex gap-2">
					<input
						type="file"
						accept="image/*"
						className="hidden"
						ref={fileInputRef}
						onChange={onFileChange}
					/>
					<Button
						type="button"
						variant="outline"
						onClick={() => fileInputRef.current?.click()}
					>
						+ Image
					</Button>
					<input
						type="text"
						value={chat.input}
						onChange={chat.handleInputChange}
						onPaste={onPaste}
						placeholder="Ask the studio agent... (you can also paste an image)"
						className="flex-1 px-4 py-2 border rounded-md"
					/>
					<Button type="submit">Send</Button>
				</form>
			</div>
		</div>
	);
}
