import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	Badge,
	Button,
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
	FieldTitle,
	Input,
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
	REGEXP_ONLY_DIGITS,
	Spinner,
	toast
} from "@workspace/ui";
import { Fragment, useState } from "react";
import z from "zod";
import { authClient } from "@/auth/client";
import { appConfig } from "@workspace/config";

type Step = "email" | "otp";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
	const [step, setStep] = useState<Step>("email");
	const [email, setEmail] = useState("");
	const queryClient = useQueryClient();

	const sendOtpMutation = useMutation({
		mutationFn: async (email: string) => {
			return authClient.emailOtp.sendVerificationOtp({
				email,
				type: "sign-in"
			});
		},
		onSuccess: (response) => {
			if (response?.error) {
				toast.error(
					response.error.message || "Failed to send verification code"
				);
				return;
			}
			setStep("otp");
			toast.success("Verification code sent to your email");
		},
		onError: (error: { error?: { message?: string } }) => {
			toast.error(
				error.error?.message || "Failed to send verification code"
			);
		}
	});

	const verifyOtpMutation = useMutation({
		mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
			return authClient.signIn.emailOtp({ email, otp });
		},
		onSuccess: async (response) => {
			if (response?.error) {
				toast.error(response.error.message || "Failed to sign in");
				return;
			}
			toast.success("Successfully signed in");

			if (response?.data) {
				queryClient.setQueryData(["user"], response.data);
			}

			window.location.href = redirectTo || appConfig.authDefaultRedirect;
		},
		onError: (error: { error?: { message?: string } }) => {
			console.error("Sign in error:", error);
			toast.error(error.error?.message || "Failed to sign in");
		}
	});

	const emailForm = useForm({
		defaultValues: {
			email: ""
		},
		validators: {
			onChange: z.object({
				email: z.string().email("Invalid email address")
			})
		},
		onSubmit: async ({ value }) => {
			setEmail(value.email);
			await sendOtpMutation.mutateAsync(value.email);
		}
	});

	// OTP form
	const otpForm = useForm({
		defaultValues: {
			otp: ""
		},
		validators: {
			onChange: z.object({
				otp: z.string().min(6, "OTP must be at least 6 characters")
			})
		},
		onSubmit: async ({ value }) => {
			await verifyOtpMutation.mutateAsync({ email, otp: value.otp });
		}
	});

	const socialSignInMutation = useMutation({
		mutationFn: async ({ provider }: { provider: "google" }) => {
			const callbackURL = redirectTo
				? `${import.meta.env.VITE_URL}${redirectTo}`
				: `${import.meta.env.VITE_URL}${appConfig.authDefaultRedirect}`;
			return authClient.signIn.social({
				provider,
				callbackURL
			});
		},
		onError: (error: { error?: { message?: string } }, variables) => {
			toast.error(
				error.error?.message ||
					`Failed to sign in with ${variables.provider}`
			);
		}
	});

	const lastMethod = authClient.getLastUsedLoginMethod();

	const handleBack = () => {
		setStep("email");
		sendOtpMutation.reset();
		verifyOtpMutation.reset();
	};

	return (
		<Fragment>
			{/* Email Step */}
			{step === "email" ? (
				<div className="space-y-3">
					<Button
						type="button"
						className="relative flex w-full items-center justify-center space-x-2 border border-input bg-background text-foreground hover:bg-white hover:text-black"
						onClick={() =>
							socialSignInMutation.mutate({ provider: "google" })
						}
						disabled={socialSignInMutation.isPending}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							width="24"
							height="24"
							aria-hidden="true"
							role="img"
						>
							<title>Google Logo</title>
							<path
								fill="#4285F4"
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							/>
							<path
								fill="#34A853"
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							/>
							<path
								fill="#FBBC05"
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
							/>
							<path
								fill="#EA4335"
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							/>
						</svg>
						<span>Sign in with Google</span>
						{lastMethod === "google" && (
							<Badge className="-top-3 -right-2 absolute text-[10px]">
								Last used
							</Badge>
						)}
					</Button>

					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							emailForm.handleSubmit();
						}}
					>
						<div className="space-y-4">
							<emailForm.Field name="email">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched &&
										!field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>
												<FieldTitle className="font-medium font-mono text-foreground text-sm">
													Email address
												</FieldTitle>
											</FieldLabel>
											<FieldContent>
												<Input
													id={field.name}
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) =>
														field.handleChange(
															e.target.value
														)
													}
													aria-invalid={isInvalid}
													type="email"
													placeholder="you@example.com"
													autoComplete="email"
													className="mb-2 h-10 border-border bg-background font-mono text-sm transition-colors focus:border-foreground focus:ring-1 focus:ring-foreground"
													disabled={
														sendOtpMutation.isPending
													}
												/>
												<FieldDescription className="font-mono text-muted-foreground text-xs leading-relaxed">
													We'll send you a one-time
													password
												</FieldDescription>

												{isInvalid && (
													<FieldError
														errors={
															field.state.meta
																.errors
														}
													/>
												)}
											</FieldContent>
										</Field>
									);
								}}
							</emailForm.Field>

							<Button
								type="submit"
								className="h-10 w-full border border-foreground bg-foreground font-medium font-mono text-background text-sm transition-colors hover:bg-background hover:text-foreground"
								disabled={sendOtpMutation.isPending}
							>
								{sendOtpMutation.isPending ? (
									<>
										<Spinner /> Sending code...
									</>
								) : (
									"Continue"
								)}
							</Button>
						</div>
					</form>
				</div>
			) : null}
			{/* OTP Step */}
			{step === "otp" ? (
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						otpForm.handleSubmit();
					}}
				>
					<div className="space-y-4">
						<button
							type="button"
							onClick={handleBack}
							className="-ml-2 mb-2 flex items-center gap-2 rounded px-2 py-1.5 font-mono text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
						>
							<HugeiconsIcon
								icon={ArrowLeft01Icon}
								strokeWidth={2}
								className="h-4 w-4"
							/>
							Back
						</button>

						<otpForm.Field name="otp">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched &&
									!field.state.meta.isValid;

								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>
											<FieldTitle className="font-medium font-mono text-foreground text-sm">
												Verification code
											</FieldTitle>
										</FieldLabel>
										<FieldContent className="w-full">
											<InputOTP
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(value) =>
													field.handleChange(value)
												}
												aria-invalid={isInvalid}
												disabled={
													verifyOtpMutation.isPending
												}
												maxLength={6}
												pattern={REGEXP_ONLY_DIGITS}
												type="text"
												placeholder="000000"
												autoComplete="one-time-code"
												inputMode="numeric"
												containerClassName="font-mono mx-auto w-full max-w-[16rem]"
											>
												<InputOTPGroup>
													<InputOTPSlot index={0} />
													<InputOTPSlot index={1} />
													<InputOTPSlot index={2} />
												</InputOTPGroup>
												<InputOTPSeparator />
												<InputOTPGroup>
													<InputOTPSlot index={3} />
													<InputOTPSlot index={4} />
													<InputOTPSlot index={5} />
												</InputOTPGroup>
											</InputOTP>
											<FieldDescription className="font-mono text-muted-foreground text-xs leading-relaxed">
												Enter the 6-digit code from your
												email
											</FieldDescription>
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
						</otpForm.Field>

						<Button
							type="submit"
							className="h-10 w-full border border-foreground bg-foreground font-medium font-mono text-background text-sm transition-colors hover:bg-background hover:text-foreground"
							disabled={verifyOtpMutation.isPending}
						>
							{verifyOtpMutation.isPending ? (
								<>
									<Spinner />
									Verifying...
								</>
							) : (
								"Verify & Sign in"
							)}
						</Button>

						<button
							type="button"
							onClick={() => sendOtpMutation.mutate(email)}
							disabled={sendOtpMutation.isPending}
							className="w-full rounded py-2 text-center font-mono text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
						>
							Didn't receive the code? Resend
						</button>
					</div>
				</form>
			) : null}
		</Fragment>
	);
}
