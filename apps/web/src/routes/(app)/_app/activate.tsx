import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import {
	Button,
	Spinner,
	Input,
	Field,
	FieldLabel,
	FieldTitle,
	FieldContent,
	FieldError,
	toast
} from "@workspace/ui";
import { activateLicenseFn } from "@/routes/-fn/license";
import { sessionsOptions } from "@/routes/-fn/auth";

export const Route = createFileRoute("/(app)/_app/activate")({
	beforeLoad: async ({ context, location }) => {
		const session = await context.queryClient.fetchQuery(sessionsOptions());
		if (!session?.user) {
			throw redirect({
				to: "/login",
				search: { redirect: location.href }
			});
		}
	},
	component: ActivatePage
});

const ActivateSchema = z.object({
	key: z.string().min(1, "License key is required")
});

function ActivatePage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: (key: string) => activateLicenseFn({ data: { data: key } }),
		onSuccess: (data) => {
			if ((data as any)?.alreadyMember) {
				toast.success("You already have access.");
			} else {
				toast.success("Access granted!");
			}
			queryClient.invalidateQueries({ queryKey: ["session"] });
			navigate({ to: "/feed" });
		},
		onError: (err: any) => {
			toast.error(err?.message || "Invalid license key.");
		}
	});

	const form = useForm({
		defaultValues: { key: "" },
		validators: { onChange: ActivateSchema },
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync(value.key);
		}
	});

	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
			<div className="w-full max-w-sm">
				<h1 className="font-heading font-semibold text-[1.75rem] leading-[1.1] tracking-[-0.02em] text-foreground mb-2">
					Activate your access
				</h1>
				<p className="mb-8 text-sm leading-relaxed text-muted-foreground">
					Enter your license key to unlock the full archive.
				</p>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
					className="flex flex-col gap-4"
				>
					<form.Field name="key">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched &&
								!field.state.meta.isValid;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>
										<FieldTitle>License key</FieldTitle>
									</FieldLabel>
									<FieldContent>
										<Input
											id={field.name}
											type="text"
											placeholder="XXXX-XXXX-XXXX-XXXX"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) =>
												field.handleChange(
													e.target.value
												)
											}
											disabled={mutation.isPending}
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

					<Button
						type="submit"
						disabled={mutation.isPending}
						className="w-full"
					>
						{mutation.isPending && <Spinner />}
						{mutation.isPending
							? "Activating..."
							: "Activate access"}
					</Button>
				</form>
			</div>
		</div>
	);
}
