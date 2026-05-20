export function BulkBar({
	selected,
	total,
	onSelectAll,
	onClearAll,
	onApprove,
	onReject,
	isPending
}: {
	selected: string[];
	total: number;
	onSelectAll: () => void;
	onClearAll: () => void;
	onApprove: () => void;
	onReject: () => void;
	isPending: boolean;
}) {
	if (total === 0) return null;

	return (
		<div
			className="flex items-center gap-3 px-4 py-2.5 rounded-lg mb-4"
			style={{
				background: "oklch(0.94 0.025 55)",
				border: "1px solid oklch(0.88 0.008 80)"
			}}
		>
			<label
				className="flex items-center gap-2 cursor-pointer text-sm"
				style={{ color: "oklch(0.30 0.008 60)" }}
			>
				<input
					type="checkbox"
					checked={selected.length === total && total > 0}
					onChange={
						selected.length === total ? onClearAll : onSelectAll
					}
					className="w-4 h-4"
				/>
				{selected.length === 0
					? `Select all (${total})`
					: `${selected.length} of ${total} selected`}
			</label>

			{selected.length > 0 && (
				<>
					<div
						className="h-4 w-px"
						style={{ background: "oklch(0.85 0.008 80)" }}
					/>
					<button
						onClick={onApprove}
						disabled={isPending}
						className="px-3 py-1 rounded text-xs font-medium disabled:opacity-50"
						style={{
							background: "oklch(0.62 0.14 140)",
							color: "white"
						}}
					>
						{isPending
							? "Approving…"
							: `Approve ${selected.length}`}
					</button>
					<button
						onClick={onReject}
						disabled={isPending}
						className="px-3 py-1 rounded text-xs disabled:opacity-50"
						style={{
							background: "oklch(0.92 0.010 20)",
							color: "oklch(0.45 0.14 20)"
						}}
					>
						Reject {selected.length}
					</button>
					<button
						onClick={onClearAll}
						className="ml-auto text-xs"
						style={{ color: "oklch(0.50 0.010 60)" }}
					>
						Clear
					</button>
				</>
			)}
		</div>
	);
}
