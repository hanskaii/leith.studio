import {
	useMutation,
	useQueryClient,
	useSuspenseQuery
} from "@tanstack/react-query";
import { Button, toast } from "@workspace/ui";
import { deleteApiKeyFn, listApiKeysQueryOptions } from "@/routes/-fn/auth";
import { ApiKeyItem } from "./api-key-item";

export function ApiKeyList({
	handleCreateKey
}: {
	handleCreateKey: () => void;
}) {
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
