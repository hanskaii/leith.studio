import { useRef } from "react";
import { Button, Spinner, Field, FieldLabel, FieldTitle, FieldContent } from "@workspace/ui";

type Props = {
	form: any;
	isUploading: boolean;
	onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export function CoverUploadField({ form, isUploading, onUpload }: Props) {
	const coverInputRef = useRef<HTMLInputElement>(null);

	return (
		<form.Field name="coverImage">
			{(field: any) => (
				<Field>
					<FieldLabel>
						<FieldTitle>Cover image</FieldTitle>
					</FieldLabel>
					<FieldContent>
						{field.state.value ? (
							<div className="relative rounded-md overflow-hidden aspect-[16/9]">
								<img
									src={field.state.value}
									alt="Cover"
									className="w-full h-full object-cover"
								/>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => field.handleChange(null)}
									className="absolute top-2 right-2"
									style={{
										background: "oklch(0.15 0.008 60 / 0.7)",
										color: "oklch(0.97 0.008 80)"
									}}
								>
									Remove
								</Button>
							</div>
						) : (
							<Button
								type="button"
								variant="outline"
								onClick={() => coverInputRef.current?.click()}
								disabled={isUploading}
								className="h-24 w-full border-dashed border-2"
							>
								{isUploading ? (
									<>
										<Spinner /> Uploading...
									</>
								) : (
									"+ Upload cover"
								)}
							</Button>
						)}
						<input
							ref={coverInputRef}
							type="file"
							accept="image/jpeg,image/png,image/webp"
							className="hidden"
							onChange={onUpload}
						/>
					</FieldContent>
				</Field>
			)}
		</form.Field>
	);
}
