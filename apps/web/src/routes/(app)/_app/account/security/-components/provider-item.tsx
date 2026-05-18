import {
	Button,
	Spinner,
	Field,
	FieldLabel,
	FieldDescription
} from "@workspace/ui";
import { useForm } from "@tanstack/react-form";
import type { AuthProvider } from "./providers-config";

export function ProviderItem({
	provider,
	accounts,
	linkMutation,
	unlinkMutation
}: {
	provider: AuthProvider;
	accounts: any[];
	linkMutation: any;
	unlinkMutation: any;
}) {
	const connectedAccount = accounts?.find(
		(acc: any) => acc.providerId === provider.id
	);
	const isConnected = !!connectedAccount;

	const form = useForm({
		defaultValues: { providerId: provider.id },
		onSubmit: async () => {
			if (isConnected) {
				await unlinkMutation.mutateAsync({
					providerId: provider.id,
					accountId: connectedAccount.accountId
				});
			} else {
				await linkMutation.mutateAsync(provider.id);
			}
		}
	});

	return (
		<Field
			orientation="horizontal"
			className="rounded-xl border border-border bg-muted/20 p-4 items-center"
		>
			<div className="flex items-center gap-3 flex-1 pr-4">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background ring-1 ring-foreground/10">
					{provider.icon}
				</div>
				<div className="flex flex-col gap-1">
					<FieldLabel className="text-sm font-semibold text-foreground m-0 p-0 leading-tight">
						{provider.name}
					</FieldLabel>
					<FieldDescription className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
						{isConnected ? "Connected" : "Not connected"}
					</FieldDescription>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
				>
					<form.Subscribe selector={(state) => [state.isSubmitting]}>
						{([isSubmitting]) => (
							<Button
								type="submit"
								variant="outline"
								disabled={isSubmitting}
							>
								{isSubmitting ? (
									<Spinner className="size-3" />
								) : isConnected ? (
									"Disconnect"
								) : (
									"Connect"
								)}
							</Button>
						)}
					</form.Subscribe>
				</form>
			</div>
		</Field>
	);
}
