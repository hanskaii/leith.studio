"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import {
	Button,
	Input,
	Modal,
	ModalHeader,
	ModalTitle,
	ModalDescription,
	ModalFooter,
	Field,
	FieldLabel,
	FieldTitle,
	FieldContent,
	FieldError,
	Spinner,
	toast
} from "@workspace/ui";
import {
	createTopicFn,
	updateTopicFn,
	type StudioTopic
} from "@/routes/-fn/studio";

const TopicFormSchema = z.object({
	topic: z.string().min(1, "Topic is required").max(200),
	referenceImageUrl: z
		.string()
		.url("Must be a valid URL")
		.or(z.literal(""))
		.optional(),
	countOverride: z.number().int().min(1).max(10).optional()
});

export function TopicFormModal({
	topic,
	showModal,
	setShowModal
}: {
	topic?: StudioTopic | null;
	showModal: boolean;
	setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
}) {
	const queryClient = useQueryClient();
	const isEdit = !!topic;

	const createMutation = useMutation({
		mutationFn: (data: z.infer<typeof TopicFormSchema>) =>
			createTopicFn({
				data: {
					data: {
						topic: data.topic,
						referenceImageUrl: data.referenceImageUrl || undefined,
						countOverride: data.countOverride
					}
				}
			}),
		onSuccess: () => {
			toast.success("Topic created");
			queryClient.invalidateQueries({ queryKey: ["studio-topics"] });
			setShowModal(false);
		},
		onError: (e: any) => toast.error(e?.message || "Failed to create topic")
	});

	const updateMutation = useMutation({
		mutationFn: (data: z.infer<typeof TopicFormSchema>) =>
			updateTopicFn({
				data: {
					data: {
						id: topic!.id,
						data: {
							topic: data.topic,
							referenceImageUrl:
								data.referenceImageUrl || undefined,
							countOverride: data.countOverride
						}
					}
				}
			}),
		onSuccess: () => {
			toast.success("Topic updated");
			queryClient.invalidateQueries({ queryKey: ["studio-topics"] });
			setShowModal(false);
		},
		onError: (e: any) => toast.error(e?.message || "Failed to update topic")
	});

	const isPending = createMutation.isPending || updateMutation.isPending;

	const form = useForm({
		defaultValues: {
			topic: topic?.topic ?? "",
			referenceImageUrl: topic?.referenceImageUrl ?? "",
			countOverride: topic?.countOverride ?? undefined
		},
		validators: {
			onChange: TopicFormSchema
		},
		onSubmit: async ({ value }) => {
			if (isEdit) {
				await updateMutation.mutateAsync(value);
			} else {
				await createMutation.mutateAsync(value);
			}
		}
	});

	return (
		<Modal
			showModal={showModal}
			setShowModal={setShowModal}
			className="p-6"
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="flex flex-col gap-6"
			>
				<ModalHeader>
					<ModalTitle>
						{isEdit ? "Edit topic" : "New topic"}
					</ModalTitle>
					<ModalDescription>
						Topics are used to auto-generate background video assets
						via the cron pipeline.
					</ModalDescription>
				</ModalHeader>

				<div className="flex flex-col gap-4">
					<form.Field name="topic">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched &&
								!field.state.meta.isValid;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>
										<FieldTitle>Topic / keyword</FieldTitle>
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
											placeholder="e.g. cozy lofi room, dark fantasy forest"
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

					<form.Field name="referenceImageUrl">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched &&
								!field.state.meta.isValid;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>
										<FieldTitle>
											Reference image URL
										</FieldTitle>
									</FieldLabel>
									<FieldContent>
										<Input
											id={field.name}
											value={field.state.value ?? ""}
											onBlur={field.handleBlur}
											onChange={(e) =>
												field.handleChange(
													e.target.value
												)
											}
											placeholder="https://... (overrides global setting)"
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

					<form.Field name="countOverride">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched &&
								!field.state.meta.isValid;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>
										<FieldTitle>Count override</FieldTitle>
									</FieldLabel>
									<FieldContent>
										<Input
											id={field.name}
											type="number"
											min={1}
											max={10}
											value={field.state.value ?? ""}
											onBlur={field.handleBlur}
											onChange={(e) => {
												const v = e.target.value;
												field.handleChange(
													v
														? parseInt(v)
														: (undefined as any)
												);
											}}
											placeholder="Default from settings"
											className="max-w-32"
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
				</div>

				<ModalFooter>
					<Button
						type="button"
						variant="ghost"
						onClick={() => setShowModal(false)}
					>
						Cancel
					</Button>
					<form.Subscribe selector={(state) => state.canSubmit}>
						{(canSubmit) => (
							<Button
								type="submit"
								disabled={!canSubmit || isPending}
							>
								{isPending && <Spinner />}
								{isPending ? "Saving..." : "Save"}
							</Button>
						)}
					</form.Subscribe>
				</ModalFooter>
			</form>
		</Modal>
	);
}
