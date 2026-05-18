import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { toast } from "@workspace/ui";
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
		<div
			className="flex flex-col items-center justify-center min-h-[60vh] px-6"
			style={{ background: "oklch(0.97 0.008 80)" }}
		>
			<div className="w-full max-w-sm">
				<h1
					className="mb-2"
					style={{
						fontFamily: "var(--font-heading)",
						fontWeight: 600,
						fontSize: "1.75rem",
						lineHeight: 1.1,
						letterSpacing: "-0.02em",
						color: "oklch(0.15 0.008 60)"
					}}
				>
					Activate your access
				</h1>
				<p
					className="mb-8 text-sm leading-relaxed"
					style={{
						color: "oklch(0.50 0.010 60)",
						fontFamily: "var(--font-sans)"
					}}
				>
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
								<div className="flex flex-col gap-1.5">
									<label
										htmlFor="key"
										className="text-xs font-medium"
										style={{
											color: "oklch(0.15 0.008 60)",
											fontFamily: "var(--font-sans)",
											letterSpacing: "0.01em"
										}}
									>
										License key
									</label>
									<input
										id="key"
										type="text"
										placeholder="XXXX-XXXX-XXXX-XXXX"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) =>
											field.handleChange(e.target.value)
										}
										disabled={mutation.isPending}
										className="w-full px-3 py-2 text-sm rounded-md border outline-none transition-all disabled:opacity-50"
										style={{
											borderColor: isInvalid
												? "oklch(0.577 0.245 27.325)"
												: "oklch(0.88 0.008 80)",
											background: "oklch(0.97 0.008 80)",
											color: "oklch(0.15 0.008 60)",
											fontFamily: "var(--font-sans)"
										}}
									/>
									{isInvalid &&
										field.state.meta.errors.length > 0 && (
											<p
												className="text-xs"
												style={{
													color: "oklch(0.577 0.245 27.325)",
													fontFamily:
														"var(--font-sans)"
												}}
											>
												{field.state.meta.errors[0]?.toString()}
											</p>
										)}
								</div>
							);
						}}
					</form.Field>

					<button
						type="submit"
						disabled={mutation.isPending}
						className="w-full px-5 py-2.5 rounded-md text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
						style={{
							background: "oklch(0.62 0.14 47)",
							color: "oklch(0.97 0.008 80)",
							fontFamily: "var(--font-sans)"
						}}
					>
						{mutation.isPending ? (
							<>
								<svg
									className="animate-spin h-4 w-4"
									viewBox="0 0 24 24"
									fill="none"
								>
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="4"
									/>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8v8z"
									/>
								</svg>
								Activating...
							</>
						) : (
							"Activate access"
						)}
					</button>
				</form>
			</div>
		</div>
	);
}
