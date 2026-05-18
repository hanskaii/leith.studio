import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import {
	Button,
	Separator,
	toast,
	Field,
	FieldLabel,
	FieldDescription
} from "@workspace/ui";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery
} from "@tanstack/react-query";
import { Gate } from "@workspace/core";
import { authClient } from "@/auth/client";
import {
	accountsListOptions,
	sessionsListOptions,
	useLogoutMutation
} from "@/routes/-fn/auth";
import { SessionItem } from "./-components/session-item";
import { ProviderItem } from "./-components/provider-item";
import { providers } from "./-components/providers-config";
import { SecuritySkeleton } from "./-components/session-skeleton";

import { Suspense } from "react";

export const Route = createFileRoute("/(app)/_app/account/security/")({
	beforeLoad: async ({ context }) => {
		const result = await Gate.can("security.manage", {
			actor: context.session.user
		});

		if (!result.allowed) {
			setTimeout(() => toast.error(result.message || "Access denied"), 0);
			throw redirect({ to: "/overview" });
		}
	},
	component: SecurityPage
});

function SecurityPage() {
	const { logout, isPending: isLogoutPending } = useLogoutMutation();

	return (
		<div className="flex flex-col gap-10 w-full mt-2 pb-10">
			<Suspense fallback={<SecuritySkeleton />}>
				<SecurityPageContent />
			</Suspense>

			<Separator />

			{/* LOGOUT ACTIONS */}
			<section className="flex flex-col gap-6">
				<Field orientation="horizontal">
					<div className="flex flex-col gap-1.5 flex-1 pr-4 pt-1">
						<FieldLabel className="text-sm font-medium text-foreground">
							Log out of this device
						</FieldLabel>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="secondary"
							onClick={() => logout()}
							disabled={isLogoutPending}
						>
							{isLogoutPending ? "Logging out..." : "Log out"}
						</Button>
					</div>
				</Field>
			</section>
		</div>
	);
}

function SecurityPageContent() {
	const queryClient = useQueryClient();
	const router = useRouter();
	const {
		session: { session }
	} = Route.useRouteContext();
	const { data: sessions } = useSuspenseQuery(sessionsListOptions());
	const { data: accounts } = useSuspenseQuery(accountsListOptions());

	const revokeSessionMutation = useMutation({
		mutationFn: async (token: string) => {
			const { error } = await authClient.revokeSession({ token });
			if (error) throw error;
			return true;
		},
		onSuccess: () => {
			toast.success("Session revoked successfully");
			queryClient.invalidateQueries({ queryKey: ["sessions"] });
		},
		onError: (error: any) => {
			toast.error(error.message || "Failed to revoke session");
		}
	});

	const revokeAllOtherSessionsMutation = useMutation({
		mutationFn: async () => {
			const { error } = await authClient.revokeOtherSessions();
			if (error) throw error;
			await authClient.signOut();
			return true;
		},
		onSuccess: () => {
			queryClient.clear();
			router.navigate({ to: "/" });
		},
		onError: (error: any) => {
			toast.error(error.message || "Failed to log out all devices");
		}
	});

	const linkAccountMutation = useMutation({
		mutationFn: async (provider: "google" | "github") => {
			const { error } = await authClient.linkSocial({
				provider,
				callbackURL: window.location.href
			});
			if (error) throw error;
			return true;
		},
		onError: (error: any) => {
			toast.error(error.message || "Failed to link account");
		}
	});

	const unlinkAccountMutation = useMutation({
		mutationFn: async ({
			providerId,
			accountId
		}: {
			providerId: string;
			accountId: string;
		}) => {
			const { error } = await authClient.unlinkAccount({
				providerId,
				accountId
			} as any);
			if (error) throw error;
			return true;
		},
		onSuccess: () => {
			toast.success("Account disconnected");
			queryClient.invalidateQueries({ queryKey: ["auth", "accounts"] });
		},
		onError: (error: any) => {
			toast.error(error.message || "Failed to disconnect account");
		}
	});

	const hasGoogle = accounts?.some((acc: any) => acc.providerId === "google");
	const hasEmailOtp = accounts?.some(
		(acc: any) =>
			acc.providerId === "email-otp" || acc.providerId === "emailotp"
	);
	const lastLoginMethod = hasGoogle
		? "Google"
		: hasEmailOtp
			? "Email OTP"
			: null;

	return (
		<div className="flex flex-col gap-10 w-full">
			{/* TRUSTED DEVICES */}
			<section className="flex flex-col gap-6">
				{lastLoginMethod && (
					<p className="text-xs text-muted-foreground">
						Last signed in with:{" "}
						<span className="font-medium text-foreground">
							{lastLoginMethod}
						</span>
					</p>
				)}

				<div className="flex flex-col gap-6 mt-2">
					<div className="flex flex-col gap-1">
						<h3 className="text-base font-semibold">
							Trusted Devices
						</h3>
						<p className="text-muted-foreground text-xs leading-relaxed max-w-md">
							After you sign in, a device becomes trusted. When
							you log in somewhere new, we'll send a prompt to
							your trusted devices for approval. You can remove a
							device from this list at any time.
						</p>
					</div>

					<div className="flex flex-col gap-3">
						{sessions?.map((s: any) => (
							<SessionItem
								key={s.token}
								sessionItem={s}
								currentSessionToken={session?.token}
								revokeSessionMutation={revokeSessionMutation}
							/>
						))}
						{sessions?.length === 0 && (
							<div className="py-12 text-center text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border">
								Nggak ada sesi aktif yang ketemu.
							</div>
						)}
					</div>
				</div>
			</section>

			<Separator />

			<Field orientation="horizontal">
				<div className="flex flex-col gap-1.5 flex-1 pr-4 pt-1">
					<FieldLabel className="text-sm font-medium text-foreground">
						Log out of all devices
					</FieldLabel>
					<FieldDescription className="text-xs text-muted-foreground leading-relaxed max-w-sm">
						Log out of all active sessions across all devices,
						including your current session.
					</FieldDescription>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						onClick={() => revokeAllOtherSessionsMutation.mutate()}
						disabled={
							revokeAllOtherSessionsMutation.isPending ||
							(sessions?.length || 0) <= 1
						}
					>
						{revokeAllOtherSessionsMutation.isPending
							? "Logging out all..."
							: "Log out all"}
					</Button>
				</div>
			</Field>

			<Separator />

			{/* CONNECTED ACCOUNTS */}
			<section className="flex flex-col gap-6">
				<div className="flex flex-col gap-1.5">
					<h3 className="text-base font-semibold text-foreground">
						Connected Accounts
					</h3>
					<p className="text-xs text-muted-foreground leading-relaxed">
						Manage which social accounts are linked to your profile
						for faster login.
					</p>
				</div>

				<div className="flex flex-col gap-3">
					{providers.map((provider) => (
						<ProviderItem
							key={provider.id}
							provider={provider}
							accounts={accounts ?? []}
							linkMutation={linkAccountMutation}
							unlinkMutation={unlinkAccountMutation}
						/>
					))}
				</div>
			</section>
		</div>
	);
}
