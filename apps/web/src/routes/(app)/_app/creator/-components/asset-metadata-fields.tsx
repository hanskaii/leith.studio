import {
	Field,
	FieldLabel,
	FieldTitle,
	FieldContent,
	Input,
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem
} from "@workspace/ui";

type Props = {
	form: any;
	isPending: boolean;
};

export function AssetMetadataFields({ form, isPending }: Props) {
	return (
		<div
			className="rounded-md border p-4 flex flex-col gap-4"
			style={{ borderColor: "oklch(0.88 0.008 80)" }}
		>
			<p
				className="text-xs font-medium"
				style={{
					color: "oklch(0.50 0.010 60)",
					fontFamily: "var(--font-sans)",
					letterSpacing: "0.04em",
					textTransform: "uppercase"
				}}
			>
				Asset metadata
			</p>

			<div className="grid grid-cols-2 gap-3">
				<form.Field name="format">
					{(field: any) => (
						<Field>
							<FieldLabel htmlFor={field.name}>
								<FieldTitle>Format</FieldTitle>
							</FieldLabel>
							<FieldContent>
								<Select
									value={field.state.value}
									onValueChange={field.handleChange}
									disabled={isPending}
								>
									<SelectTrigger id={field.name}>
										<SelectValue placeholder="Select..." />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="mp4">MP4</SelectItem>
										<SelectItem value="webm">WebM</SelectItem>
										<SelectItem value="png">PNG</SelectItem>
										<SelectItem value="jpg">JPG</SelectItem>
									</SelectContent>
								</Select>
							</FieldContent>
						</Field>
					)}
				</form.Field>

				<form.Field name="resolution">
					{(field: any) => (
						<Field>
							<FieldLabel htmlFor={field.name}>
								<FieldTitle>Resolution</FieldTitle>
							</FieldLabel>
							<FieldContent>
								<Input
									id={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isPending}
									placeholder="1920×1080"
								/>
							</FieldContent>
						</Field>
					)}
				</form.Field>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<form.Field name="duration">
					{(field: any) => (
						<Field>
							<FieldLabel htmlFor={field.name}>
								<FieldTitle>
									Duration{" "}
									<span
										className="font-normal"
										style={{ color: "oklch(0.50 0.010 60)" }}
									>
										(seconds)
									</span>
								</FieldTitle>
							</FieldLabel>
							<FieldContent>
								<Input
									id={field.name}
									type="number"
									value={field.state.value as string}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isPending}
									placeholder="30"
									min={0}
								/>
							</FieldContent>
						</Field>
					)}
				</form.Field>

				<form.Field name="access">
					{(field: any) => (
						<Field>
							<FieldLabel htmlFor={field.name}>
								<FieldTitle>Access</FieldTitle>
							</FieldLabel>
							<FieldContent>
								<Select
									value={field.state.value}
									onValueChange={(v) =>
										field.handleChange(v as "free" | "premium")
									}
									disabled={isPending}
								>
									<SelectTrigger id={field.name}>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="premium">Premium</SelectItem>
										<SelectItem value="free">Free</SelectItem>
									</SelectContent>
								</Select>
							</FieldContent>
						</Field>
					)}
				</form.Field>
			</div>

			<form.Field name="isLoop">
				{(field: any) => (
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={field.state.value}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.checked)}
							disabled={isPending}
							className="rounded"
						/>
						<span
							className="text-sm"
							style={{
								color: "oklch(0.15 0.008 60)",
								fontFamily: "var(--font-sans)"
							}}
						>
							Seamless loop
						</span>
					</label>
				)}
			</form.Field>
		</div>
	);
}
