import {
	Button,
	Spinner,
	Field,
	FieldLabel,
	FieldDescription
} from "@workspace/ui";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { useForm } from "@tanstack/react-form";
import { Day } from "@workspace/core";
import { z } from "zod";
import { type ApiKey } from "@/routes/-fn/auth";

export function ApiKeyItem({
	apiKey,
	deleteMutation
}: {
	apiKey: ApiKey;
	deleteMutation: any;
}) {
	const form = useForm({
		defaultValues: { id: apiKey.id },
		validators: {
			onChange: z.object({
				id: z.string().min(1)
			})
		},
		onSubmit: async ({ value }) => {
			await deleteMutation.mutateAsync(value.id);
		}
	});

	const lastUsed = apiKey.lastRequest
		? Day(apiKey.lastRequest).format("L")
		: "Never";

	return (
		<Field
			orientation="horizontal"
			className="rounded-xl border border-border p-4 bg-muted/20 items-center"
		>
			<div className="flex flex-col gap-1.5 flex-1 pr-4">
				<FieldLabel className="text-sm font-semibold text-foreground">
					{apiKey.name}
				</FieldLabel>
				<FieldDescription className="text-xs text-muted-foreground font-mono">
					{apiKey.prefix}**************** · Last used: {lastUsed}
				</FieldDescription>
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
								variant="ghost"
								size="icon"
								className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
								disabled={isSubmitting}
							>
								{isSubmitting ? (
									<Spinner className="size-3" />
								) : (
									<HugeiconsIcon
										icon={Delete02Icon}
										className="size-4"
									/>
								)}
							</Button>
						)}
					</form.Subscribe>
				</form>
			</div>
		</Field>
	);
}
