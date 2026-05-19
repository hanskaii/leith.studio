export function formatDate(
	d: string | number | Date | null | undefined
): string {
	if (!d) return "—";
	return new Date(d).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric"
	});
}

export function formatFileSize(bytes: number): string {
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
