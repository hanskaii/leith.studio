import { useRef } from "react";
import { Button, Spinner, Field, FieldLabel, FieldTitle, FieldContent } from "@workspace/ui";
import { formatFileSize } from "../-lib/format";

type Props = {
	form: any;
	isUploading: boolean;
	onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export function AssetUploadField({ form, isUploading, onUpload }: Props) {
	const assetInputRef = useRef<HTMLInputElement>(null);

	return (
		<form.Field name="fileKey">
			{(fileKeyField: any) => (
				<Field>
					<FieldLabel>
						<FieldTitle>
							Asset file{" "}
							<span style={{ color: "oklch(0.62 0.14 47)" }}>*</span>
						</FieldTitle>
					</FieldLabel>
					<FieldContent>
						{fileKeyField.state.value ? (
							<div
								className="flex items-center justify-between px-3 py-2.5 rounded-md border"
								style={{ borderColor: "oklch(0.88 0.008 80)" }}
							>
								<div className="flex flex-col gap-0.5">
									<form.Field name="fileName">
										{(f: any) => (
											<span
												className="text-sm font-medium truncate max-w-[200px]"
												style={{
													color: "oklch(0.15 0.008 60)",
													fontFamily: "var(--font-sans)"
												}}
											>
												{f.state.value ?? "Asset uploaded"}
											</span>
										)}
									</form.Field>
									<form.Field name="fileSize">
										{(f: any) =>
											f.state.value ? (
												<span
													className="text-xs"
													style={{
														color: "oklch(0.50 0.010 60)",
														fontFamily: "var(--font-sans)"
													}}
												>
													{formatFileSize(f.state.value)}
												</span>
											) : null
										}
									</form.Field>
								</div>
								<Button
									type="button"
									variant="destructive"
									size="sm"
									onClick={() => {
										fileKeyField.handleChange(null);
										form.setFieldValue("fileName", null);
										form.setFieldValue("fileSize", null);
									}}
								>
									Remove
								</Button>
							</div>
						) : (
							<Button
								type="button"
								variant="outline"
								onClick={() => assetInputRef.current?.click()}
								disabled={isUploading}
								className="h-24 w-full border-dashed border-2"
								style={{ borderColor: "oklch(0.62 0.14 47 / 0.4)" }}
							>
								{isUploading ? (
									<>
										<Spinner /> Uploading...
									</>
								) : (
									"+ Upload asset (MP4, PNG, JPG, WebP — up to 200MB)"
								)}
							</Button>
						)}
						<input
							ref={assetInputRef}
							type="file"
							accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
							className="hidden"
							onChange={onUpload}
						/>
					</FieldContent>
				</Field>
			)}
		</form.Field>
	);
}
