import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@workspace/ui";
import { HugeiconsIcon } from "@hugeicons/react";
import { CloudUploadIcon } from "@hugeicons/core-free-icons";
import { uploadStudioFn } from "@/routes/-fn/creator";

export function UploadZone() {
	const qc = useQueryClient();
	const inputRef = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);

	const uploadMutation = useMutation({
		mutationFn: async (file: File) => {
			const formData = new FormData();
			formData.append("file", file);
			return uploadStudioFn({ data: formData });
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["creator-posts"] });
		},
		onError: (err: any, file) => {
			toast.error(`${file.name}: ${err?.message || "Upload failed"}`);
		}
	});

	function uploadFiles(files: FileList | File[]) {
		const list = Array.from(files);
		if (list.length === 0) return;
		for (const file of list) {
			uploadMutation.mutate(file);
		}
	}

	function handleDrop(e: React.DragEvent<HTMLDivElement>) {
		e.preventDefault();
		setDragging(false);
		if (e.dataTransfer.files.length === 0) return;
		uploadFiles(e.dataTransfer.files);
	}

	function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
		if (!e.target.files) return;
		uploadFiles(e.target.files);
		e.target.value = "";
	}

	return (
		<div
			onDragOver={(e) => {
				e.preventDefault();
				setDragging(true);
			}}
			onDragLeave={() => setDragging(false)}
			onDrop={handleDrop}
			onClick={() => inputRef.current?.click()}
			className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
				dragging
					? "border-primary bg-primary/5"
					: "border-border bg-muted/20 hover:bg-muted/40"
			}`}
		>
			<HugeiconsIcon
				icon={CloudUploadIcon}
				className="size-8 text-muted-foreground"
				strokeWidth={1.5}
			/>
			<p className="text-sm font-medium">Drop files to upload</p>
			<p className="text-xs text-muted-foreground">
				or click to browse · up to 200MB each
			</p>
			<input
				ref={inputRef}
				type="file"
				multiple
				accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,audio/mpeg,audio/wav,audio/ogg,audio/aac"
				className="hidden"
				onChange={handleFilePick}
			/>
		</div>
	);
}
