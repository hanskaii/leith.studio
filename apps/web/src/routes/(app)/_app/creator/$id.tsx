import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
	useSuspenseQuery,
	useMutation,
	useQueryClient
} from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Gate } from "@workspace/core";
import {
	toast,
	Button,
	Spinner,
	Input,
	Field,
	FieldLabel,
	FieldTitle,
	FieldContent,
	FieldError,
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem
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
	uploadAssetFn
} from "@/routes/-fn/creator";
import { formatFileSize } from "./-lib/format";

export const Route = createFileRoute("/(app)/_app/creator/$id")({
	beforeLoad: async ({ context }) => {
		const result = await Gate.can("content.manage", {
			actor: context.session.user
		});
		if (!result.allowed) {
			throw redirect({ to: "/feed", search: { page: 1 } });
		}
	},
	component: PostEditorPage
});

const PostSchema = z.object({
	title: z.string().min(1, "Title is required"),
	tags: z.string(),
	coverImage: z.string().nullable(),
	coverThumb: z.string().nullable(),
	fileKey: z.string().nullable(),
	fileName: z.string().nullable(),
	fileSize: z.number().nullable(),
	format: z.string(),
	resolution: z.string(),
	duration: z.union([z.string(), z.number()]),
	isLoop: z.boolean(),
	access: z.enum(["free", "premium"])
});

function PostEditorPage() {
	const { id } = Route.useParams();
	const isNew = id === "new";
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const { data: posts } = useSuspenseQuery(creatorPostsQueryOptions());
	const existing = isNew ? null : (posts?.find((p) => p.id === id) ?? null);

	// Upload-in-progress flags are UI state, not form values
	const [isUploadingCover, setIsUploadingCover] = useState(false);
	const [isUploadingAsset, setIsUploadingAsset] = useState(false);
	const coverInputRef = useRef<HTMLInputElement>(null);
	const assetInputRef = useRef<HTMLInputElement>(null);

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
				? (existing as any).tags.join(", ")
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
						<form.Subscribe selector={(state) => state.canSubmit}>
							{(canSubmit) => (
								<Button
									variant="outline"
									size="lg"
									type="submit"
									disabled={!canSubmit || isPending}
								>
									{isPending && <Spinner />}
									{isPending ? "Saving..." : "Save draft"}
								</Button>
							)}
						</form.Subscribe>
						{!isNew && (
							<form.Subscribe
								selector={(state) => state.values.fileKey}
							>
								{(fileKey) => (
									<Button
										size="lg"
										type="button"
										onClick={handlePublish}
										disabled={isPending || !fileKey}
										title={
											!fileKey
												? "Upload an asset file before publishing"
												: undefined
										}
									>
										{isPending && <Spinner />}
										{isPending ? "Saving..." : "Publish"}
									</Button>
								)}
							</form.Subscribe>
						)}
					</div>
				</div>

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
						{/* Title */}
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

						{/* Tags */}
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

						{/* Cover image */}
						<form.Field name="coverImage">
							{(field) => (
								<Field>
									<FieldLabel>
										<FieldTitle>Cover image</FieldTitle>
									</FieldLabel>
									<FieldContent>
										{field.state.value ? (
											<div className="relative rounded-md overflow-hidden aspect-[16/9]">
												<img
													src={field.state.value}
													alt="Cover"
													className="w-full h-full object-cover"
												/>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() =>
														field.handleChange(null)
													}
													className="absolute top-2 right-2"
													style={{
														background:
															"oklch(0.15 0.008 60 / 0.7)",
														color: "oklch(0.97 0.008 80)"
													}}
												>
													Remove
												</Button>
											</div>
										) : (
											<Button
												type="button"
												variant="outline"
												onClick={() =>
													coverInputRef.current?.click()
												}
												disabled={isUploadingCover}
												className="h-24 w-full border-dashed border-2"
											>
												{isUploadingCover ? (
													<>
														<Spinner /> Uploading...
													</>
												) : (
													"+ Upload cover"
												)}
											</Button>
										)}
										<input
											ref={coverInputRef}
											type="file"
											accept="image/jpeg,image/png,image/webp"
											className="hidden"
											onChange={handleCoverUpload}
										/>
									</FieldContent>
								</Field>
							)}
						</form.Field>

						{/* Asset file */}
						<form.Field name="fileKey">
							{(fileKeyField) => (
								<Field>
									<FieldLabel>
										<FieldTitle>
											Asset file{" "}
											<span
												style={{
													color: "oklch(0.62 0.14 47)"
												}}
											>
												*
											</span>
										</FieldTitle>
									</FieldLabel>
									<FieldContent>
										{fileKeyField.state.value ? (
											<div
												className="flex items-center justify-between px-3 py-2.5 rounded-md border"
												style={{
													borderColor:
														"oklch(0.88 0.008 80)"
												}}
											>
												<div className="flex flex-col gap-0.5">
													<form.Field name="fileName">
														{(f) => (
															<span
																className="text-sm font-medium truncate max-w-[200px]"
																style={{
																	color: "oklch(0.15 0.008 60)",
																	fontFamily:
																		"var(--font-sans)"
																}}
															>
																{f.state
																	.value ??
																	"Asset uploaded"}
															</span>
														)}
													</form.Field>
													<form.Field name="fileSize">
														{(f) =>
															f.state.value ? (
																<span
																	className="text-xs"
																	style={{
																		color: "oklch(0.50 0.010 60)",
																		fontFamily:
																			"var(--font-sans)"
																	}}
																>
																	{formatFileSize(
																		f.state
																			.value
																	)}
																</span>
															) : null
														}
													</form.Field>
												</div>
												<Button
													type="button"
													variant="destructive"
													size="sm"
													onClick={() => {
														fileKeyField.handleChange(
															null
														);
														form.setFieldValue(
															"fileName",
															null
														);
														form.setFieldValue(
															"fileSize",
															null
														);
													}}
												>
													Remove
												</Button>
											</div>
										) : (
											<Button
												type="button"
												variant="outline"
												onClick={() =>
													assetInputRef.current?.click()
												}
												disabled={isUploadingAsset}
												className="h-24 w-full border-dashed border-2"
												style={{
													borderColor:
														"oklch(0.62 0.14 47 / 0.4)"
												}}
											>
												{isUploadingAsset ? (
													<>
														<Spinner /> Uploading...
													</>
												) : (
													"+ Upload asset (MP4, PNG, JPG, WebP — up to 200MB)"
												)}
											</Button>
										)}
										<input
											ref={assetInputRef}
											type="file"
											accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
											className="hidden"
											onChange={handleAssetUpload}
										/>
									</FieldContent>
								</Field>
							)}
						</form.Field>

						{/* Asset metadata */}
						<div
							className="rounded-md border p-4 flex flex-col gap-4"
							style={{ borderColor: "oklch(0.88 0.008 80)" }}
						>
							<p
								className="text-xs font-medium"
								style={{
									color: "oklch(0.50 0.010 60)",
									fontFamily: "var(--font-sans)",
									letterSpacing: "0.04em",
									textTransform: "uppercase"
								}}
							>
								Asset metadata
							</p>

							<div className="grid grid-cols-2 gap-3">
								<form.Field name="format">
									{(field) => (
										<Field>
											<FieldLabel htmlFor={field.name}>
												<FieldTitle>Format</FieldTitle>
											</FieldLabel>
											<FieldContent>
												<Select
													value={field.state.value}
													onValueChange={
														field.handleChange
													}
													disabled={isPending}
												>
													<SelectTrigger
														id={field.name}
													>
														<SelectValue placeholder="Select..." />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="mp4">
															MP4
														</SelectItem>
														<SelectItem value="webm">
															WebM
														</SelectItem>
														<SelectItem value="png">
															PNG
														</SelectItem>
														<SelectItem value="jpg">
															JPG
														</SelectItem>
													</SelectContent>
												</Select>
											</FieldContent>
										</Field>
									)}
								</form.Field>

								<form.Field name="resolution">
									{(field) => (
										<Field>
											<FieldLabel htmlFor={field.name}>
												<FieldTitle>
													Resolution
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
													placeholder="1920×1080"
												/>
											</FieldContent>
										</Field>
									)}
								</form.Field>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<form.Field name="duration">
									{(field) => (
										<Field>
											<FieldLabel htmlFor={field.name}>
												<FieldTitle>
													Duration{" "}
													<span
														className="font-normal"
														style={{
															color: "oklch(0.50 0.010 60)"
														}}
													>
														(seconds)
													</span>
												</FieldTitle>
											</FieldLabel>
											<FieldContent>
												<Input
													id={field.name}
													type="number"
													value={
														field.state
															.value as string
													}
													onBlur={field.handleBlur}
													onChange={(e) =>
														field.handleChange(
															e.target.value
														)
													}
													disabled={isPending}
													placeholder="30"
													min={0}
												/>
											</FieldContent>
										</Field>
									)}
								</form.Field>

								<form.Field name="access">
									{(field) => (
										<Field>
											<FieldLabel htmlFor={field.name}>
												<FieldTitle>Access</FieldTitle>
											</FieldLabel>
											<FieldContent>
												<Select
													value={field.state.value}
													onValueChange={(v) =>
														field.handleChange(
															v as
																| "free"
																| "premium"
														)
													}
													disabled={isPending}
												>
													<SelectTrigger
														id={field.name}
													>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="premium">
															Premium
														</SelectItem>
														<SelectItem value="free">
															Free
														</SelectItem>
													</SelectContent>
												</Select>
											</FieldContent>
										</Field>
									)}
								</form.Field>
							</div>

							<form.Field name="isLoop">
								{(field) => (
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											checked={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) =>
												field.handleChange(
													e.target.checked
												)
											}
											disabled={isPending}
											className="rounded"
										/>
										<span
											className="text-sm"
											style={{
												color: "oklch(0.15 0.008 60)",
												fontFamily: "var(--font-sans)"
											}}
										>
											Seamless loop
										</span>
									</label>
								)}
							</form.Field>
						</div>

						{/* Body editor */}
						<Field>
							<FieldLabel>
								<FieldTitle>Body</FieldTitle>
							</FieldLabel>
							<FieldContent>
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
							</FieldContent>
						</Field>
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
