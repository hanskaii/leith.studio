import { EditorContent } from "@tiptap/react";
import { Field, FieldLabel, FieldTitle, FieldContent } from "@workspace/ui";

type Props = {
	editor: any;
};

export function BodyEditorField({ editor }: Props) {
	return (
		<Field>
			<FieldLabel>
				<FieldTitle>Body</FieldTitle>
			</FieldLabel>
			<FieldContent>
				<div
					className="rounded-md border px-4 py-3 min-h-[300px]"
					style={{
						borderColor: "oklch(0.88 0.008 80)",
						background: "oklch(0.97 0.008 80)",
						color: "oklch(0.15 0.008 60)",
						fontFamily: "var(--font-sans)",
						lineHeight: 1.65
					}}
				>
					<EditorContent editor={editor} />
				</div>
			</FieldContent>
		</Field>
	);
}
