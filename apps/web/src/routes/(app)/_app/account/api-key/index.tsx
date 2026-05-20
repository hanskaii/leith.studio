import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	Button,
	Separator,
	Field,
	FieldLabel,
	FieldDescription,
	toast
} from "@workspace/ui";
import { Gate } from "@workspace/core";
import { AppModalContext } from "@/routes/-components/providers/app-modal-provider";
import { useContext, Suspense } from "react";
import { ApiKeyList } from "./-components/api-key-list";
import { ApiKeySkeleton } from "./-components/api-key-skeleton";

export const Route = createFileRoute("/(app)/_app/account/api-key/")({
	beforeLoad: async ({ context }) => {
		const result = await Gate.can("api-keys.manage", {
			actor: context.session.user
		});

		if (!result.allowed) {
			setTimeout(() => toast.error(result.message || "Access denied"), 0);
			throw redirect({ to: "/overview" });
		}
	},
	component: ApiKeyPage
});

function ApiKeyPage() {
	const { openCreateApiKeyModal, openShowApiKeyModal } =
		useContext(AppModalContext);

	const handleCreateKey = () => {
		openCreateApiKeyModal((key) => {
			openShowApiKeyModal(key);
		});
	};

	return (
		<div className="flex flex-col gap-10 w-full mt-2 pb-10">
			<section className="flex flex-col gap-6">
				<Field orientation="horizontal">
					<div className="flex flex-col gap-1.5 flex-1 pr-4 pt-1">
						<FieldLabel className="text-sm font-medium text-foreground">
							Manage API Keys
						</FieldLabel>
						<FieldDescription className="text-xs text-muted-foreground leading-relaxed max-w-sm">
							Generate and manage API keys for accessing the
							application programmatically.
						</FieldDescription>
					</div>
					<div className="flex items-center gap-2">
						<Button onClick={handleCreateKey}>Create Key</Button>
					</div>
				</Field>

				<Separator />

				<Suspense fallback={<ApiKeySkeleton />}>
					<ApiKeyList handleCreateKey={handleCreateKey} />
				</Suspense>
			</section>
		</div>
	);
}
