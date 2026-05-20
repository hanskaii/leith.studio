import { useEffect } from "react";
import {
	useSuspenseQuery,
	useMutation,
	useQueryClient
} from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import {
	toast,
	Field,
	FieldLabel,
	FieldTitle,
	FieldDescription,
	FieldContent,
	FieldError,
	Input,
	Textarea,
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
	Spinner
} from "@workspace/ui";
import {
	studioSettingsQueryOptions,
	updateSettingsFn,
	type StudioSettings
} from "@/routes/-fn/studio";

const IMAGE_MODELS = [
	"nano-banana",
	"nano-banana-2",
	"nano-banana-pro",
	"qwen-image",
	"seedream-4.0",
	"seedream-4.5",
	"seedream-5.0-lite",
	"kling-3.0",
	"kling-o3",
	"gpt-image-2.0"
];

const VIDEO_MODELS = [
	"kling-v3",
	"kling-o3",
	"veo-3.1-fast",
	"veo-3.1-quality",
	"veo-3.1-lite",
	"v6",
	"v5.6",
	"pixverse-c1",
	"seedance-2.0",
	"seedance-2.0-fast",
	"sora-2",
	"happyhorse-1.0"
];

const SettingsSchema = z.object({
	defaultImageModel: z.string().min(1),
	defaultVideoModel: z.string().min(1),
	defaultCount: z.number().int().min(1, "Min 1").max(10, "Max 10"),
	globalReferenceImageUrl: z
		.string()
		.url("Must be a valid URL")
		.or(z.literal("")),
	imagePromptTemplate: z.string().min(10, "Min 10 characters"),
	videoPromptTemplate: z.string().min(10, "Min 10 characters")
});

type SettingsValues = z.infer<typeof SettingsSchema>;

function settingsToValues(settings: StudioSettings | null): SettingsValues {
	return {
		defaultImageModel: settings?.defaultImageModel ?? "nano-banana-2",
		defaultVideoModel: settings?.defaultVideoModel ?? "kling-v3",
		defaultCount: settings?.defaultCount ?? 3,
		globalReferenceImageUrl: settings?.globalReferenceImageUrl ?? "",
		imagePromptTemplate: settings?.imagePromptTemplate ?? "",
		videoPromptTemplate: settings?.videoPromptTemplate ?? ""
	};
}

function SettingsForm({ settings }: { settings: StudioSettings | null }) {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: (data: SettingsValues) =>
			updateSettingsFn({
				data: {
					data: {
						defaultImageModel: data.defaultImageModel,
						defaultVideoModel: data.defaultVideoModel,
						defaultCount: data.defaultCount,
						globalReferenceImageUrl:
							data.globalReferenceImageUrl || null,
						imagePromptTemplate:
							data.imagePromptTemplate || undefined,
						videoPromptTemplate:
							data.videoPromptTemplate || undefined
					}
				}
			}),
		onSuccess: () => {
			toast.success("Settings saved");
			queryClient.invalidateQueries({ queryKey: ["studio-settings"] });
		},
		onError: (e: any) =>
			toast.error(e?.message || "Failed to save settings")
	});

	const form = useForm({
		defaultValues: settingsToValues(settings),
		validators: {
			onChange: SettingsSchema
		},
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync(value);
		}
	});

	useEffect(() => {
		form.reset(settingsToValues(settings));
	}, [settings]);

	const isPending = mutation.isPending;

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className="max-w-2xl flex flex-col gap-6"
		>
			{/* Models */}
			<section className="flex flex-col gap-4">
				<h2
					className="text-sm font-semibold mb-1"
					style={{
						color: "oklch(0.25 0.008 60)",
						fontFamily: "var(--font-heading)"
					}}
				>
					Default models
				</h2>
				<div className="grid grid-cols-2 gap-4">
					<form.Field name="defaultImageModel">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched &&
								!field.state.meta.isValid;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>
										<FieldTitle>Image model</FieldTitle>
									</FieldLabel>
									<FieldContent>
										<Select
											value={field.state.value}
											onValueChange={(v) =>
												field.handleChange(v)
											}
											disabled={isPending}
										>
											<SelectTrigger id={field.name}>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{IMAGE_MODELS.map((m) => (
													<SelectItem
														key={m}
														value={m}
													>
														{m}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{isInvalid && (
											<FieldError
												errors={field.state.meta.errors}
											/>
										)}
									</FieldContent>
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="defaultVideoModel">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched &&
								!field.state.meta.isValid;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>
										<FieldTitle>Video model</FieldTitle>
									</FieldLabel>
									<FieldContent>
										<Select
											value={field.state.value}
											onValueChange={(v) =>
												field.handleChange(v)
											}
											disabled={isPending}
										>
											<SelectTrigger id={field.name}>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{VIDEO_MODELS.map((m) => (
													<SelectItem
														key={m}
														value={m}
													>
														{m}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{isInvalid && (
											<FieldError
												errors={field.state.meta.errors}
											/>
										)}
									</FieldContent>
								</Field>
							);
						}}
					</form.Field>
				</div>
			</section>

			{/* Count */}
			<section>
				<form.Field name="defaultCount">
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched &&
							!field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>
									<FieldTitle>Generation count</FieldTitle>
									<FieldDescription>
										videos generated per topic per cron run
									</FieldDescription>
								</FieldLabel>
								<FieldContent>
									<Input
										id={field.name}
										type="number"
										min={1}
										max={10}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) =>
											field.handleChange(
												parseInt(e.target.value) || 3
											)
										}
										disabled={isPending}
										className="w-24"
									/>
									{isInvalid && (
										<FieldError
											errors={field.state.meta.errors}
										/>
									)}
								</FieldContent>
							</Field>
						);
					}}
				</form.Field>
			</section>

			{/* Reference image */}
			<section>
				<form.Field name="globalReferenceImageUrl">
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched &&
							!field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>
									<FieldTitle>
										Global reference image
									</FieldTitle>
									<FieldDescription>
										Style reference applied to all topics
										unless overridden per-topic.
									</FieldDescription>
								</FieldLabel>
								<FieldContent>
									<Input
										id={field.name}
										type="url"
										placeholder="https://... (public image URL)"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) =>
											field.handleChange(e.target.value)
										}
										disabled={isPending}
									/>
									{isInvalid && (
										<FieldError
											errors={field.state.meta.errors}
										/>
									)}
								</FieldContent>
							</Field>
						);
					}}
				</form.Field>
			</section>

			{/* Prompt templates */}
			<section>
				<form.Field name="imagePromptTemplate">
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched &&
							!field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>
									<FieldTitle>
										Image prompt template
									</FieldTitle>
									<FieldDescription>
										Use {"{topic}"} as placeholder for the
										topic keyword.
									</FieldDescription>
								</FieldLabel>
								<FieldContent>
									<Textarea
										id={field.name}
										rows={6}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) =>
											field.handleChange(e.target.value)
										}
										disabled={isPending}
										className="font-mono text-xs resize-y"
									/>
									{isInvalid && (
										<FieldError
											errors={field.state.meta.errors}
										/>
									)}
								</FieldContent>
							</Field>
						);
					}}
				</form.Field>
			</section>

			<section>
				<form.Field name="videoPromptTemplate">
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched &&
							!field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>
									<FieldTitle>
										Video prompt template
									</FieldTitle>
									<FieldDescription>
										Use {"{image_prompt}"} as placeholder
										for the generated image prompt.
									</FieldDescription>
								</FieldLabel>
								<FieldContent>
									<Textarea
										id={field.name}
										rows={6}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) =>
											field.handleChange(e.target.value)
										}
										disabled={isPending}
										className="font-mono text-xs resize-y"
									/>
									{isInvalid && (
										<FieldError
											errors={field.state.meta.errors}
										/>
									)}
								</FieldContent>
							</Field>
						);
					}}
				</form.Field>
			</section>

			<div className="flex justify-end">
				<form.Subscribe
					selector={(state) => [state.canSubmit, state.isDirty]}
				>
					{([canSubmit, isDirty]) => (
						<button
							type="submit"
							disabled={!canSubmit || !isDirty || isPending}
							className="px-5 py-2 rounded-md text-sm font-medium disabled:opacity-50 flex items-center gap-2 cursor-pointer"
							style={{
								background: "oklch(0.62 0.14 47)",
								color: "oklch(0.97 0.008 80)"
							}}
						>
							{isPending && <Spinner className="size-4" />}
							{isPending ? "Saving..." : "Save settings"}
						</button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}

export function SettingsContent() {
	const { data: settings } = useSuspenseQuery(studioSettingsQueryOptions());
	return <SettingsForm settings={settings} />;
}
