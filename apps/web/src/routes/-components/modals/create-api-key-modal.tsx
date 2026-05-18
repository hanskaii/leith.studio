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
	FieldError,
	toast
} from "@workspace/ui";
import { createApiKeyFn } from "@/routes/-fn/auth";

export function CreateApiKeyModal({
	showModal,
	setShowModal,
	onCreated
}: {
	showModal: boolean;
	setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
	onCreated: (key: string) => void;
}) {
	const queryClient = useQueryClient();

	const createMutation = useMutation({
		mutationFn: (name: string) => createApiKeyFn({ data: name }),
		onSuccess: (data) => {
			toast.success("API Key created");
			queryClient.invalidateQueries({ queryKey: ["api-keys"] });
			onCreated(data.key);
			setShowModal(false);
		},
		onError: (error: any) => {
			toast.error(error.message || "Failed to create API key");
		}
	});

	const form = useForm({
		defaultValues: {
			name: ""
		},
		validators: {
			onChange: z.object({
				name: z.string().min(2, "Name must be at least 2 characters")
			})
		},
		onSubmit: async ({ value }) => {
			await createMutation.mutateAsync(value.name);
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
					<ModalTitle>Create API Key</ModalTitle>
					<ModalDescription>
						Give your key a name to help you identify it later.
					</ModalDescription>
				</ModalHeader>

				<form.Field name="name">
					{(field) => (
						<Field>
							<FieldLabel htmlFor={field.name}>
								Key Name
							</FieldLabel>
							<Input
								id={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) =>
									field.handleChange(e.target.value)
								}
								placeholder="e.g. Production App"
							/>
							{field.state.meta.isTouched &&
								field.state.meta.errors.length > 0 && (
									<FieldError
										errors={field.state.meta.errors}
									/>
								)}
						</Field>
					)}
				</form.Field>

				<ModalFooter>
					<Button
						type="button"
						variant="ghost"
						onClick={() => setShowModal(false)}
					>
						Cancel
					</Button>
					<form.Subscribe
						selector={(state) => [
							state.canSubmit,
							state.isSubmitting
						]}
					>
						{([canSubmit, isSubmitting]) => (
							<Button
								type="submit"
								disabled={!canSubmit || isSubmitting}
							>
								{isSubmitting ? "Creating..." : "Create Key"}
							</Button>
						)}
					</form.Subscribe>
				</ModalFooter>
			</form>
		</Modal>
	);
}
