export function StatusBadge({ status }: { status: string }) {
	const isPublished = status === "published";
	return (
		<span
			className="rounded px-2 py-0.5 text-xs font-medium"
			style={{
				background: isPublished
					? "oklch(0.85 0.09 145 / 0.15)"
					: "oklch(0.92 0.006 80)",
				color: isPublished
					? "oklch(0.45 0.12 145)"
					: "oklch(0.50 0.010 60)"
			}}
		>
			{status}
		</span>
	);
}
