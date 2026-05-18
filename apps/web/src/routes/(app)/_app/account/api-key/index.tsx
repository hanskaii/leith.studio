import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	Button,
	Separator,
	Field,
	FieldLabel,
	FieldDescription,
	toast
} from "@workspace/ui";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery
} from "@tanstack/react-query";
import { Gate } from "@workspace/core";
import { deleteApiKeyFn, listApiKeysQueryOptions } from "@/routes/-fn/auth";
import { AppModalContext } from "@/routes/-components/providers/app-modal-provider";
import { useContext, Suspense } from "react";
import { ApiKeyItem } from "./-components/api-key-item";
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

function ApiKeyList({ handleCreateKey }: { handleCreateKey: () => void }) {
	const queryClient = useQueryClient();
	const { data: apiKeys } = useSuspenseQuery(listApiKeysQueryOptions());

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteApiKeyFn({ data: id }),
		onSuccess: () => {
			toast.success("API Key deleted");
			queryClient.invalidateQueries({ queryKey: ["api-keys"] });
		},
		onError: (error: any) => {
			toast.error(error.message || "Failed to delete API key");
		}
	});

	return (
		<div className="flex flex-col gap-3 mt-2">
			{apiKeys?.map((key) => (
				<ApiKeyItem
					key={key.id}
					apiKey={key}
					deleteMutation={deleteMutation}
				/>
			))}

			{apiKeys?.length === 0 && (
				<div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed border-border">
					<p className="text-xs">You don't have any API keys yet.</p>
					<Button
						variant="ghost"
						className="text-xs"
						onClick={handleCreateKey}
					>
						Create your first API key
					</Button>
				</div>
			)}
		</div>
	);
}
