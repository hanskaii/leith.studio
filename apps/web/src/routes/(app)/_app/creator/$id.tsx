import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
	useSuspenseQuery,
	useMutation,
	useQueryClient
} from "@tanstack/react-query";
import { Suspense, useCallback, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Gate } from "@workspace/core";
import { toast } from "@workspace/ui";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
	creatorPostsQueryOptions,
	createPostFn,
	updatePostFn,
	uploadImageFn
} from "@/routes/-fn/creator";

export const Route = createFileRoute("/(app)/_app/creator/$id")({
	beforeLoad: async ({ context }) => {
		const result = await Gate.can("content.manage", {
			actor: context.session.user
		});
		if (!result.allowed) {
			throw redirect({ to: "/feed" });
		}
	},
	component: PostEditorPage
});

const PostSchema = z.object({
	title: z.string().min(1, "Title is required"),
	tags: z.string()
});

function PostEditorPage() {
	const { id } = Route.useParams();
	const isNew = id === "new";
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const { data: posts } = useSuspenseQuery(creatorPostsQueryOptions());
	const existing = isNew ? null : (posts?.find((p) => p.id === id) ?? null);

	const [coverImage, setCoverImage] = useState<string | null>(
		(existing as any)?.coverImage ?? null
	);
	const [isUploadingCover, setIsUploadingCover] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const editor = useEditor({
		extensions: [
			StarterKit,
			Image,
			Placeholder.configure({
				placeholder: "Write your breakdown here..."
			})
		],
		content: existing?.body
			? (() => {
					try {
						return JSON.parse(existing.body as string);
					} catch {
						return existing.body;
					}
				})()
			: undefined,
		editorProps: {
			attributes: {
				class: "outline-none min-h-[400px] prose-funnnit"
			}
		}
	});

	const createMutation = useMutation({
		mutationFn: createPostFn,
		onSuccess: (data) => {
			toast.success("Draft saved");
			queryClient.invalidateQueries({ queryKey: ["creator-posts"] });
			if ((data as any)?.id) {
				navigate({
					to: "/creator/$id",
					params: { id: (data as any).id }
				});
			}
		},
		onError: (err: any) =>
			toast.error(err?.message || "Failed to save post")
	});

	const updateMutation = useMutation({
		mutationFn: updatePostFn,
		onSuccess: () => {
			toast.success("Saved");
			queryClient.invalidateQueries({ queryKey: ["creator-posts"] });
		},
		onError: (err: any) =>
			toast.error(err?.message || "Failed to save post")
	});

	const isPending = createMutation.isPending || updateMutation.isPending;

	const form = useForm({
		defaultValues: {
			title: existing?.title ?? "",
			tags: Array.isArray((existing as any)?.tags)
				? (existing as any).tags.join(", ")
				: ""
		},
		validators: { onChange: PostSchema },
		onSubmit: async ({ value }) => {
			const tags = value.tags
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean);
			const body = editor ? JSON.stringify(editor.getJSON()) : "{}";

			if (isNew) {
				await createMutation.mutateAsync({
					data: {
						data: {
							title: value.title,
							body,
							tags,
							coverImage: coverImage ?? undefined
						}
					}
				});
			} else {
				await updateMutation.mutateAsync({
					data: {
						data: {
							id,
							data: { title: value.title, body, tags, coverImage }
						}
					}
				});
			}
		}
	});

	const handlePublish = async () => {
		const body = editor ? JSON.stringify(editor.getJSON()) : "{}";
		if (isNew) {
			toast.error("Save as draft first before publishing.");
			return;
		}
		await updateMutation.mutateAsync({
			data: { data: { id, data: { status: "published" as const, body } } }
		});
		toast.success("Published!");
		queryClient.invalidateQueries({ queryKey: ["creator-posts"] });
	};

	const handleCoverUpload = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;
			setIsUploadingCover(true);
			try {
				const form = new FormData();
				form.append("file", file);
				const result = await uploadImageFn({ data: form });
				setCoverImage(result?.url ?? null);
				toast.success("Cover uploaded");
			} catch (err: any) {
				toast.error(err?.message || "Upload failed");
			} finally {
				setIsUploadingCover(false);
			}
		},
		[]
	);

	return (
		<div
			className="min-h-[100dvh] px-6 py-8 md:px-14"
			style={{ background: "oklch(0.97 0.008 80)" }}
		>
			<div className="flex items-center justify-between mb-8 gap-4">
				<h1
					style={{
						fontFamily: "var(--font-heading)",
						fontWeight: 600,
						fontSize: "1.25rem",
						letterSpacing: "-0.01em",
						color: "oklch(0.15 0.008 60)"
					}}
				>
					{isNew ? "New post" : "Edit post"}
				</h1>
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={() => form.handleSubmit()}
						disabled={isPending}
						className="px-4 py-2 rounded-md text-sm border transition-all disabled:opacity-50"
						style={{
							borderColor: "oklch(0.88 0.008 80)",
							color: "oklch(0.15 0.008 60)",
							fontFamily: "var(--font-sans)"
						}}
					>
						{isPending ? "Saving..." : "Save draft"}
					</button>
					{!isNew && (
						<button
							type="button"
							onClick={handlePublish}
							disabled={isPending}
							className="px-4 py-2 rounded-md text-sm font-medium transition-all disabled:opacity-50"
							style={{
								background: "oklch(0.62 0.14 47)",
								color: "oklch(0.97 0.008 80)",
								fontFamily: "var(--font-sans)"
							}}
						>
							{isPending ? "Saving..." : "Publish"}
						</button>
					)}
				</div>
			</div>

			<div className="grid md:grid-cols-[1fr_1fr] gap-6">
				{/* Left: form */}
				<div className="flex flex-col gap-5">
					<form.Field name="title">
						{(field) => (
							<div className="flex flex-col gap-1.5">
								<label
									className="text-xs font-medium"
									style={{
										color: "oklch(0.15 0.008 60)",
										fontFamily: "var(--font-sans)",
										letterSpacing: "0.01em"
									}}
								>
									Title
								</label>
								<input
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) =>
										field.handleChange(e.target.value)
									}
									disabled={isPending}
									placeholder="ControlNet Depth: Precise Spatial Control"
									className="w-full px-3 py-2 text-sm rounded-md border outline-none"
									style={{
										borderColor: "oklch(0.88 0.008 80)",
										background: "oklch(0.97 0.008 80)",
										color: "oklch(0.15 0.008 60)",
										fontFamily: "var(--font-sans)"
									}}
								/>
								{field.state.meta.isTouched &&
									field.state.meta.errors.length > 0 && (
										<p
											className="text-xs"
											style={{
												color: "oklch(0.577 0.245 27.325)",
												fontFamily: "var(--font-sans)"
											}}
										>
											{field.state.meta.errors[0]?.toString()}
										</p>
									)}
							</div>
						)}
					</form.Field>

					<form.Field name="tags">
						{(field) => (
							<div className="flex flex-col gap-1.5">
								<label
									className="text-xs font-medium"
									style={{
										color: "oklch(0.15 0.008 60)",
										fontFamily: "var(--font-sans)",
										letterSpacing: "0.01em"
									}}
								>
									Tags{" "}
									<span
										style={{
											color: "oklch(0.50 0.010 60)"
										}}
									>
										(comma separated)
									</span>
								</label>
								<input
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) =>
										field.handleChange(e.target.value)
									}
									disabled={isPending}
									placeholder="controlnet, technique, prompting"
									className="w-full px-3 py-2 text-sm rounded-md border outline-none"
									style={{
										borderColor: "oklch(0.88 0.008 80)",
										background: "oklch(0.97 0.008 80)",
										color: "oklch(0.15 0.008 60)",
										fontFamily: "var(--font-sans)"
									}}
								/>
							</div>
						)}
					</form.Field>

					{/* Cover image upload */}
					<div className="flex flex-col gap-1.5">
						<label
							className="text-xs font-medium"
							style={{
								color: "oklch(0.15 0.008 60)",
								fontFamily: "var(--font-sans)",
								letterSpacing: "0.01em"
							}}
						>
							Cover image
						</label>

						{coverImage ? (
							<div className="relative rounded-md overflow-hidden aspect-[16/9]">
								<img
									src={coverImage}
									alt="Cover"
									className="w-full h-full object-cover"
								/>
								<button
									type="button"
									onClick={() => setCoverImage(null)}
									className="absolute top-2 right-2 px-2 py-1 rounded text-xs"
									style={{
										background:
											"oklch(0.15 0.008 60 / 0.7)",
										color: "oklch(0.97 0.008 80)",
										fontFamily: "var(--font-sans)"
									}}
								>
									Remove
								</button>
							</div>
						) : (
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								disabled={isUploadingCover}
								className="flex items-center justify-center h-32 rounded-md border-2 border-dashed text-sm transition-all hover:border-[oklch(0.62_0.14_47)] disabled:opacity-50"
								style={{
									borderColor: "oklch(0.88 0.008 80)",
									color: "oklch(0.50 0.010 60)",
									fontFamily: "var(--font-sans)"
								}}
							>
								{isUploadingCover
									? "Uploading..."
									: "+ Upload cover"}
							</button>
						)}
						<input
							ref={fileInputRef}
							type="file"
							accept="image/jpeg,image/png,image/webp"
							className="hidden"
							onChange={handleCoverUpload}
						/>
					</div>

					{/* TipTap editor */}
					<div className="flex flex-col gap-1.5">
						<label
							className="text-xs font-medium"
							style={{
								color: "oklch(0.15 0.008 60)",
								fontFamily: "var(--font-sans)",
								letterSpacing: "0.01em"
							}}
						>
							Body
						</label>
						<div
							className="rounded-md border px-4 py-3 min-h-[300px]"
							style={{
								borderColor: "oklch(0.88 0.008 80)",
								background: "oklch(0.97 0.008 80)",
								color: "oklch(0.15 0.008 60)",
								fontFamily: "var(--font-sans)",
								lineHeight: 1.65
							}}
						>
							<EditorContent editor={editor} />
						</div>
					</div>
				</div>

				{/* Right: live preview */}
				<div className="hidden md:flex flex-col gap-1.5">
					<p
						className="text-xs font-medium"
						style={{
							color: "oklch(0.50 0.010 60)",
							fontFamily: "var(--font-sans)",
							letterSpacing: "0.01em"
						}}
					>
						Preview
					</p>
					<div
						className="rounded-md border px-6 py-5 min-h-[400px] overflow-auto"
						style={{
							borderColor: "oklch(0.88 0.008 80)",
							background: "oklch(0.97 0.008 80)",
							color: "oklch(0.15 0.008 60)",
							fontFamily: "var(--font-sans)",
							lineHeight: 1.65
						}}
					>
						{editor && (
							<div className="prose-funnnit">
								<EditorContent editor={editor} />
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
