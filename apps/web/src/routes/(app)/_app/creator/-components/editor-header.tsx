import { Button, Spinner } from "@workspace/ui";

type Props = {
	isNew: boolean;
	isPending: boolean;
	form: any;
	onPublish: () => void;
};

export function EditorHeader({ isNew, isPending, form, onPublish }: Props) {
	return (
		<div className="flex items-center justify-between mb-8 gap-4">
			<h1
				style={{
					fontFamily: "var(--font-heading)",
					fontWeight: 600,
					fontSize: "1.25rem",
					letterSpacing: "-0.01em",
					color: "oklch(0.15 0.008 60)"
				}}
			>
				{isNew ? "New post" : "Edit post"}
			</h1>
			<div className="flex items-center gap-3">
				<form.Subscribe selector={(state: any) => state.canSubmit}>
					{(canSubmit: boolean) => (
						<Button
							variant="outline"
							size="lg"
							type="submit"
							disabled={!canSubmit || isPending}
						>
							{isPending && <Spinner />}
							{isPending ? "Saving..." : "Save draft"}
						</Button>
					)}
				</form.Subscribe>
				{!isNew && (
					<form.Subscribe
						selector={(state: any) => state.values.fileKey}
					>
						{(fileKey: string | null) => (
							<Button
								size="lg"
								type="button"
								onClick={onPublish}
								disabled={isPending || !fileKey}
								title={
									!fileKey
										? "Upload an asset file before publishing"
										: undefined
								}
							>
								{isPending && <Spinner />}
								{isPending ? "Saving..." : "Publish"}
							</Button>
						)}
					</form.Subscribe>
				)}
			</div>
		</div>
	);
}
