import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
	useSuspenseQuery,
	useQuery,
	useMutation,
	useQueryClient
} from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Gate } from "@workspace/core";
import {
	toast,
	Input,
	Field,
	FieldLabel,
	FieldTitle,
	FieldContent,
	FieldError
} from "@workspace/ui";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
	creatorPostsQueryOptions,
	createPostFn,
	updatePostFn,
	uploadImageFn,
	uploadAssetFn,
	postStatusQueryOptions
} from "@/routes/-fn/creator";
import { PostSchema } from "./-lib/schema";
import { EditorHeader } from "./-components/editor-header";
import { CoverUploadField } from "./-components/cover-upload-field";
import { AssetUploadField } from "./-components/asset-upload-field";
import { AssetMetadataFields } from "./-components/asset-metadata-fields";
import { BodyEditorField } from "./-components/body-editor-field";

export const Route = createFileRoute("/(app)/_app/creator/$id")({
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
	component: PostEditorPage
});

function PostEditorPage() {
	const { id } = Route.useParams();
	const isNew = id === "new";
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const { data: posts } = useSuspenseQuery(creatorPostsQueryOptions());
	const existing = isNew ? null : (posts?.find((p) => p.id === id) ?? null);

	const [isUploadingCover, setIsUploadingCover] = useState(false);
	const [isUploadingAsset, setIsUploadingAsset] = useState(false);

	const hasMedia = !isNew && !!existing?.fileKey;
	const { data: postStatus } = useQuery(postStatusQueryOptions(id, hasMedia));

	const editor = useEditor({
		extensions: [
			StarterKit,
			Image,
			Placeholder.configure({
				placeholder: "Write your breakdown here..."
			})
		],
		content: (existing as any)?.body
			? (() => {
					try {
						return JSON.parse((existing as any).body as string);
					} catch {
						return (existing as any).body;
					}
				})()
			: undefined,
		editorProps: {
			attributes: { class: "outline-none min-h-[400px] prose-leith" }
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

	const form = useForm({
		defaultValues: {
			title: existing?.title ?? "",
			tags: Array.isArray((existing as any)?.tags)
				? (existing as any).tags
						.map((t: any) =>
							typeof t === "string"
								? t
								: (t?.name ?? t?.slug ?? "")
						)
						.filter(Boolean)
						.join(", ")
				: "",
			coverImage: ((existing as any)?.coverImage ?? null) as
				| string
				| null,
			coverThumb: ((existing as any)?.coverThumb ?? null) as
				| string
				| null,
			fileKey: ((existing as any)?.fileKey ?? null) as string | null,
			fileName: null as string | null,
			fileSize: ((existing as any)?.fileSize ?? null) as number | null,
			format: ((existing as any)?.format ?? "") as string,
			resolution: ((existing as any)?.resolution ?? "") as string,
			duration: ((existing as any)?.duration ?? "") as string | number,
			isLoop: !!(existing as any)?.isLoop,
			access: ((existing as any)?.access ?? "premium") as
				| "free"
				| "premium"
		},
		validators: { onChange: PostSchema },
		onSubmit: async ({ value }) => {
			const tags = value.tags
				.split(",")
				.map((t: string) => t.trim())
				.filter(Boolean);
			const body = editor ? JSON.stringify(editor.getJSON()) : "{}";

			const assetFields =
				value.fileKey && value.format && value.resolution
					? {
							fileKey: value.fileKey,
							fileSize: value.fileSize ?? undefined,
							format: value.format as
								| "mp4"
								| "png"
								| "jpg"
								| "webm",
							resolution: value.resolution,
							duration: value.duration
								? Number(value.duration)
								: undefined,
							isLoop: value.isLoop,
							access: value.access
						}
					: {};

			if (isNew) {
				await createMutation.mutateAsync({
					data: {
						data: {
							title: value.title,
							body,
							tags,
							coverImage: value.coverImage ?? undefined,
							coverThumb: value.coverThumb ?? undefined,
							...assetFields
						}
					}
				});
			} else {
				await updateMutation.mutateAsync({
					data: {
						data: {
							id,
							data: {
								title: value.title,
								body,
								tags,
								coverImage: value.coverImage,
								coverThumb: value.coverThumb,
								...assetFields
							}
						}
					}
				});
			}
		}
	});

	const isPending = createMutation.isPending || updateMutation.isPending;

	const handlePublish = async () => {
		if (isNew) {
			toast.error("Save as draft first before publishing.");
			return;
		}
		if (!form.getFieldValue("fileKey")) {
			toast.error("Upload an asset file before publishing.");
			return;
		}
		const body = editor ? JSON.stringify(editor.getJSON()) : "{}";
		await updateMutation.mutateAsync({
			data: { data: { id, data: { status: "published" as const, body } } }
		});
		toast.success("Published!");
		queryClient.invalidateQueries({ queryKey: ["creator-posts"] });
	};

	const handleCoverUpload = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setIsUploadingCover(true);
		try {
			const formData = new FormData();
			formData.append("file", file);
			const result = await uploadImageFn({ data: formData });
			form.setFieldValue("coverImage", result?.url ?? null);
			form.setFieldValue("coverThumb", result?.thumbUrl ?? null);
			toast.success("Cover uploaded");
		} catch (err: any) {
			toast.error(err?.message || "Upload failed");
		} finally {
			setIsUploadingCover(false);
		}
	};

	const handleAssetUpload = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setIsUploadingAsset(true);
		try {
			const formData = new FormData();
			formData.append("file", file);
			const result = await uploadAssetFn({ data: formData });
			form.setFieldValue("fileKey", result?.key ?? null);
			form.setFieldValue("fileName", file.name);
			form.setFieldValue("fileSize", file.size);
			toast.success("Asset uploaded");
		} catch (err: any) {
			toast.error(err?.message || "Upload failed");
		} finally {
			setIsUploadingAsset(false);
		}
	};

	return (
		<div
			className="min-h-[100dvh] px-6 py-8 md:px-14"
			style={{ background: "oklch(0.97 0.008 80)" }}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
			>
				<EditorHeader
					isNew={isNew}
					isPending={isPending}
					form={form}
					onPublish={handlePublish}
				/>

				<form.Subscribe selector={(state) => state.values.fileKey}>
					{(fileKey) =>
						!isNew && !fileKey ? (
							<div
								className="mb-6 px-4 py-3 rounded-md text-sm"
								style={{
									background: "oklch(0.94 0.025 55)",
									color: "oklch(0.52 0.14 47)",
									fontFamily: "var(--font-sans)",
									borderLeft: "3px solid oklch(0.62 0.14 47)"
								}}
							>
								Upload an asset file before publishing
							</div>
						) : null
					}
				</form.Subscribe>

				<div className="grid md:grid-cols-[1fr_1fr] gap-6">
					<div className="flex flex-col gap-5">
						<form.Field name="title">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched &&
									!field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>
											<FieldTitle>Title</FieldTitle>
										</FieldLabel>
										<FieldContent>
											<Input
												id={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) =>
													field.handleChange(
														e.target.value
													)
												}
												disabled={isPending}
												placeholder="Warm Rustic Mountain Lodge Background"
											/>
											{isInvalid && (
												<FieldError
													errors={
														field.state.meta.errors
													}
												/>
											)}
										</FieldContent>
									</Field>
								);
							}}
						</form.Field>

						<form.Field name="tags">
							{(field) => (
								<Field>
									<FieldLabel htmlFor={field.name}>
										<FieldTitle>
											Tags{" "}
											<span
												className="font-normal"
												style={{
													color: "oklch(0.50 0.010 60)"
												}}
											>
												(comma separated)
											</span>
										</FieldTitle>
									</FieldLabel>
									<FieldContent>
										<Input
											id={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) =>
												field.handleChange(
													e.target.value
												)
											}
											disabled={isPending}
											placeholder="cozy, fireplace, twitch background"
										/>
									</FieldContent>
								</Field>
							)}
						</form.Field>

						<CoverUploadField
							form={form}
							isUploading={isUploadingCover}
							onUpload={handleCoverUpload}
						/>

						<AssetUploadField
							form={form}
							isUploading={isUploadingAsset}
							onUpload={handleAssetUpload}
						/>

						<AssetMetadataFields
							form={form}
							isPending={isPending}
						/>

						<BodyEditorField editor={editor} />
					</div>

					<div className="hidden md:flex flex-col gap-4">
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

						{hasMedia && <AssetPreview postStatus={postStatus} />}

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
								<div className="prose-leith">
									<EditorContent editor={editor} />
								</div>
							)}
						</div>
					</div>
				</div>
			</form>
		</div>
	);
}

type PostStatus = {
	processingStatus:
		| "pending"
		| "processing"
		| "ready"
		| "failed"
		| null
		| undefined;
	previewKey: string | null | undefined;
	clipKey: string | null | undefined;
	format: string | null | undefined;
};

function AssetPreview({
	postStatus
}: {
	postStatus: PostStatus | null | undefined;
}) {
	const status = postStatus?.processingStatus;
	const previewKey = postStatus?.previewKey;
	const format = postStatus?.format;

	if (!status || status === "pending" || status === "processing") {
		return (
			<div
				className="rounded-md border flex items-center justify-center gap-2 py-6 text-sm"
				style={{
					borderColor: "oklch(0.88 0.008 80)",
					background: "oklch(0.95 0.010 80)",
					color: "oklch(0.50 0.010 60)",
					fontFamily: "var(--font-sans)"
				}}
			>
				<span
					className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
					aria-hidden
				/>
				Processing preview…
			</div>
		);
	}

	if (status === "failed") {
		return (
			<div
				className="rounded-md border px-4 py-3 text-sm"
				style={{
					borderColor: "oklch(0.88 0.008 80)",
					background: "oklch(0.96 0.012 25)",
					color: "oklch(0.50 0.12 25)",
					fontFamily: "var(--font-sans)"
				}}
			>
				Preview generation failed.
			</div>
		);
	}

	if (status === "ready" && previewKey) {
		const src = `/api/files/${previewKey}`;
		const isAudio = format && ["mp3", "wav", "ogg", "aac"].includes(format);

		if (isAudio) {
			return (
				<audio
					key={previewKey}
					controls
					className="w-full rounded-md"
					style={{ accentColor: "oklch(0.62 0.14 47)" }}
				>
					<source src={src} />
				</audio>
			);
		}

		return (
			<video
				key={previewKey}
				controls
				className="w-full rounded-md"
				style={{ background: "#000" }}
			>
				<source src={src} type="video/mp4" />
			</video>
		);
	}

	return null;
}
