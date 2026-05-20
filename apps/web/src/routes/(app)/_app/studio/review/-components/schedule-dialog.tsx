import { useState } from "react";

export function ScheduleDialog({
	count,
	onClose,
	onConfirm,
	isPending
}: {
	count: number;
	onClose: () => void;
	onConfirm: (scheduledAt?: string) => void;
	isPending: boolean;
}) {
	const [scheduleDate, setScheduleDate] = useState("");

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center"
			style={{ background: "rgba(0,0,0,0.5)" }}
		>
			<div
				className="w-full max-w-sm rounded-lg p-6"
				style={{
					background: "oklch(0.99 0.002 80)",
					border: "1px solid oklch(0.88 0.008 80)"
				}}
			>
				<h2
					className="mb-1 text-base font-semibold"
					style={{
						fontFamily: "var(--font-heading)",
						color: "oklch(0.15 0.008 60)"
					}}
				>
					Approve {count} generation{count > 1 ? "s" : ""}
				</h2>
				<p
					className="text-xs mb-4"
					style={{ color: "oklch(0.50 0.010 60)" }}
				>
					AI will generate titles, descriptions, and tags for each
					post. Videos will be processed for preview.
				</p>

				<div className="mb-5">
					<label
						className="mb-1 block text-xs font-medium"
						style={{ color: "oklch(0.40 0.010 60)" }}
					>
						Schedule publish date (optional)
					</label>
					<input
						type="datetime-local"
						className="w-full rounded border px-3 py-2 text-sm outline-none"
						style={{
							borderColor: "oklch(0.85 0.008 80)",
							color: "oklch(0.15 0.008 60)",
							background: "white"
						}}
						value={scheduleDate}
						onChange={(e) => setScheduleDate(e.target.value)}
					/>
				</div>

				<div className="flex justify-end gap-2">
					<button
						onClick={onClose}
						className="px-3 py-1.5 rounded text-sm"
						style={{
							background: "oklch(0.92 0.008 80)",
							color: "oklch(0.30 0.008 60)"
						}}
					>
						Cancel
					</button>
					<button
						onClick={() =>
							onConfirm(
								scheduleDate
									? new Date(scheduleDate).toISOString()
									: undefined
							)
						}
						disabled={isPending}
						className="px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50"
						style={{
							background: "oklch(0.62 0.14 140)",
							color: "white"
						}}
					>
						{isPending ? "Creating posts…" : "Confirm"}
					</button>
				</div>
			</div>
		</div>
	);
}
