import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	Separator,
	toast,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Field,
	FieldLabel,
	FieldDescription
} from "@workspace/ui";
import { Gate } from "@workspace/core";
import { useTheme } from "@/routes/-components/providers/theme-provider";
import { ProfileSkeleton } from "./-components/profile-skeleton";
import { ProfilePageContent } from "./-components/profile-page-content";

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
	const { session } = Route.useRouteContext();

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

			<Suspense fallback={<ProfileSkeleton />}>
				<ProfilePageContent user={session?.user} />
			</Suspense>
		</div>
	);
}
