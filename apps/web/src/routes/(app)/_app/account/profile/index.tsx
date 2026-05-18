import { createFileRoute, redirect } from "@tanstack/react-router";
import * as React from "react";
import { useContext } from "react";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
	Button,
	Input,
	Separator,
	Spinner,
	toast,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Field,
	FieldContent,
	FieldError,
	FieldLabel,
	FieldTitle,
	FieldDescription
} from "@workspace/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Gate } from "@workspace/core";
import { authClient } from "@/auth/client";
import { uploadAvatarFn } from "@/routes/-fn/auth";
import { AppModalContext } from "@/routes/-components/providers/app-modal-provider";
import { useTheme } from "@/routes/-components/providers/theme-provider";
import { ProfileSkeleton } from "./-components/profile-skeleton";

import { Suspense } from "react";

export const Route = createFileRoute("/(app)/_app/account/profile/")({
	beforeLoad: async ({ context }) => {
		const result = await Gate.can("profile.update", {
			actor: context.session.user
		});

		if (!result.allowed) {
			setTimeout(() => toast.error(result.message || "Access denied"), 0);
			throw redirect({ to: "/overview" });
		}
	},
	component: ProfilePage
});

function ProfilePage() {
	const { theme, setTheme } = useTheme();

	return (
		<div className="flex flex-col gap-10 w-full mt-2 pb-10">
			{/* APPEARANCE */}
			<section className="flex flex-col gap-4 mt-2">
				<Field orientation="horizontal">
					<div className="flex flex-col gap-1.5 flex-1 pr-4">
						<FieldLabel className="text-sm font-medium text-foreground">
							Appearance
						</FieldLabel>
						<FieldDescription className="text-xs text-muted-foreground leading-relaxed max-w-sm">
							Choose how the app looks to you.
						</FieldDescription>
					</div>
					<div className="flex items-center gap-2">
						<Select
							value={theme}
							onValueChange={(v) => setTheme(v as any)}
						>
							<SelectTrigger className="w-30">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="system">System</SelectItem>
								<SelectItem value="light">Light</SelectItem>
								<SelectItem value="dark">Dark</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</Field>
			</section>

			<Separator />

			<Suspense fallback={<ProfileSkeleton />}>
				<ProfilePageContent />
			</Suspense>
		</div>
	);
}

function ProfilePageContent() {
	const queryClient = useQueryClient();
	const {
		session: { user }
	} = Route.useRouteContext();

	const { openConfirmModal } = useContext(AppModalContext);

	const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
	const fileInputRef = React.useRef<HTMLInputElement>(null);

	const updateMutation = useMutation({
		mutationFn: async (data: {
			name?: string;
			image?: string;
			username?: string;
		}) => {
			const { error } = await authClient.updateUser(data);
			if (error) throw error;
		},
		onSuccess: () => {
			toast.success("Profile updated");
			queryClient.invalidateQueries({ queryKey: ["user"] });
		},
		onError: (error: any) => {
			toast.error(error.message || "Failed to update profile");
		}
	});

	const nameSchema = z.string().min(2, "Name must be at least 2 characters");
	const usernameSchema = z
		.string()
		.min(3, "Username must be at least 3 characters")
		.regex(
			/^[a-zA-Z0-9_]+$/,
			"Username can only contain letters, numbers and underscores"
		);

	const form = useForm({
		defaultValues: {
			name: user.name ?? "",
			username: (user as any).username ?? "",
			image: user.image ?? ""
		},
		onSubmit: async ({ value }) => {
			await updateMutation.mutateAsync({
				name: value.name.trim() || undefined,
				username: value.username.trim() || undefined,
				image: value.image || undefined
			});
		}
	});

	const deleteUserMutation = useMutation({
		mutationFn: async () => {
			const { error } = await authClient.deleteUser();
			if (error) throw error;
			return true;
		},
		onSuccess: () => {
			toast.success("Account deleted");
			queryClient.clear();
			window.location.href = "/";
		},
		onError: (error: any) => {
			toast.error(error.message || "Failed to delete account");
		}
	});

	const handleImageUpload = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (file.size > 2 * 1024 * 1024) {
			toast.error("Image must be smaller than 2MB");
			return;
		}
		try {
			setIsUploadingAvatar(true);
			const formData = new FormData();
			formData.append("file", file);
			const url = await uploadAvatarFn({ data: formData });
			form.setFieldValue("image", url);
			toast.success("Photo uploaded");
		} catch (err: any) {
			toast.error(err.message || "Upload failed");
		} finally {
			setIsUploadingAvatar(false);
		}
	};

	const handleDeleteAccount = async () => {
		const result = await Gate.can("account.delete.grace-period", {
			actor: user,
			resource: { createdAt: user.createdAt }
		});

		if (!result.allowed) {
			toast.error(result.message || "Account too new");
			return;
		}

		openConfirmModal(
			{
				title: "Delete account",
				description:
					"Are you sure you want to delete your account? All your data will be permanently deleted. This action cannot be undone.",
				confirmLabel: "Delete account",
				cancelLabel: "Cancel",
				variant: "destructive"
			},
			() => deleteUserMutation.mutate()
		);
	};

	const getInitials = (name: string) =>
		name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);

	return (
		<div className="flex flex-col gap-10 w-full mt-2 pb-10">
			<Separator />

			{/* ACCOUNT FORM */}
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="flex flex-col gap-4"
			>
				{/* Avatar */}
				<div className="flex items-center gap-4 mt-2 mb-2">
					<form.Field name="image">
						{(field) => (
							<Avatar className="size-16">
								<AvatarImage
									src={field.state.value || undefined}
								/>
								<AvatarFallback className="text-base">
									{getInitials(
										user?.name || user?.email || "?"
									)}
								</AvatarFallback>
							</Avatar>
						)}
					</form.Field>

					<div className="flex flex-col gap-1.5">
						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							className="hidden"
							onChange={handleImageUpload}
						/>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => fileInputRef.current?.click()}
								disabled={isUploadingAvatar}
							>
								{isUploadingAvatar
									? "Uploading..."
									: "Change photo"}
							</Button>
							<form.Field name="image">
								{(field) =>
									field.state.value &&
									field.state.value !== user?.image && (
										<Button
											type="button"
											variant="ghost"
											onClick={() =>
												field.handleChange(
													user?.image ?? ""
												)
											}
										>
											Remove
										</Button>
									)
								}
							</form.Field>
						</div>
						<p className="text-xs text-muted-foreground">
							JPG, PNG or GIF · max 2MB
						</p>
					</div>
				</div>

				<Separator />

				{/* Display name */}
				<form.Field
					name="name"
					validators={{
						onChange: ({ value }) => {
							const result = nameSchema.safeParse(value);
							return result.success
								? undefined
								: result.error.issues[0]?.message;
						}
					}}
				>
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched &&
							!field.state.meta.isValid;
						return (
							<Field
								orientation="horizontal"
								data-invalid={isInvalid}
								className="items-start"
							>
								<div className="flex flex-col gap-1.5 flex-1 pr-4 pt-2">
									<FieldLabel htmlFor={field.name}>
										<FieldTitle className="text-sm font-medium text-foreground">
											Display name
										</FieldTitle>
									</FieldLabel>
									<FieldDescription className="text-xs text-muted-foreground leading-relaxed max-w-sm">
										Your public display name
									</FieldDescription>
								</div>
								<FieldContent className="!flex-none">
									<Input
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) =>
											field.handleChange(e.target.value)
										}
										placeholder="Your name"
										className="max-w-55"
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

				<Separator />

				{/* Username */}
				<form.Field
					name="username"
					validators={{
						onChange: ({ value }) => {
							const result = usernameSchema.safeParse(value);
							return result.success
								? undefined
								: result.error.issues[0]?.message;
						}
					}}
				>
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched &&
							!field.state.meta.isValid;
						return (
							<Field
								orientation="horizontal"
								data-invalid={isInvalid}
								className="items-start"
							>
								<div className="flex flex-col gap-1.5 flex-1 pr-4 pt-2">
									<FieldLabel htmlFor={field.name}>
										<FieldTitle className="text-sm font-medium text-foreground">
											Username
										</FieldTitle>
									</FieldLabel>
									<FieldDescription className="text-xs text-muted-foreground leading-relaxed max-w-sm">
										Your unique handle
									</FieldDescription>
								</div>
								<FieldContent className="!flex-none">
									<Input
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) =>
											field.handleChange(e.target.value)
										}
										placeholder="username"
										className="max-w-55"
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

				<Separator />

				{/* Email (read-only) */}
				<Field orientation="horizontal">
					<div className="flex flex-col gap-1.5 flex-1 pr-4 pt-2">
						<FieldLabel className="text-sm font-medium text-foreground">
							Email
						</FieldLabel>
						<FieldDescription className="text-xs text-muted-foreground leading-relaxed max-w-sm">
							Your account's email address
						</FieldDescription>
					</div>
					<div className="flex items-center gap-2">
						<Input
							value={user?.email || ""}
							disabled
							readOnly
							className="max-w-55 text-muted-foreground opacity-50"
						/>
					</div>
				</Field>

				<div className="flex justify-end mt-4">
					<form.Subscribe
						selector={(state) => [state.canSubmit, state.isDirty]}
					>
						{([canSubmit, isDirty]) => (
							<Button
								type="submit"
								disabled={
									!canSubmit ||
									!isDirty ||
									updateMutation.isPending
								}
							>
								{updateMutation.isPending ? (
									<>
										<Spinner className="size-4" />
										Saving…
									</>
								) : (
									"Save changes"
								)}
							</Button>
						)}
					</form.Subscribe>
				</div>
			</form>

			<Separator />

			{/* DANGER ZONE */}
			<section className="flex flex-col gap-4 mt-2 bg-destructive/5 border border-destructive/30 p-4 rounded-xl">
				<Field orientation="horizontal">
					<div className="flex flex-col gap-1.5 flex-1 pr-4">
						<FieldLabel className="text-sm font-semibold text-destructive">
							Delete account
						</FieldLabel>
						<FieldDescription className="text-xs text-muted-foreground leading-relaxed max-w-sm">
							Permanently delete your account and all data. This
							cannot be undone.
						</FieldDescription>
					</div>
					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant="ghost"
							className="text-destructive hover:bg-destructive/10 hover:text-destructive"
							onClick={handleDeleteAccount}
							disabled={deleteUserMutation.isPending}
						>
							{deleteUserMutation.isPending
								? "Deleting..."
								: "Delete account"}
						</Button>
					</div>
				</Field>
			</section>
		</div>
	);
}
