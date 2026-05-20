import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import {
	useSuspenseQuery,
	useMutation,
	useQueryClient
} from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { Gate } from "@workspace/core";
import { toast } from "@workspace/ui";
import {
	studioReviewQueryOptions,
	approveGenerationsFn,
	rejectGenerationsFn,
	type StudioGeneration
} from "@/routes/-fn/studio";

export const Route = createFileRoute("/(app)/_app/studio/review/")({
	beforeLoad: async ({ context }) => {
		const result = await Gate.can("content.manage", {
			actor: (context as any).session.user
		});
		if (!result.allowed) {
			throw redirect({
				to: "/feed",
				search: { page: 1, type: "all", sort: "newest" }
			});
		}
	},
	component: ReviewPage
});

// ── Bulk action bar ───────────────────────────────────────────────────────────

function BulkBar({
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

// ── Schedule dialog ───────────────────────────────────────────────────────────

function ScheduleDialog({
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

// ── Generation card ───────────────────────────────────────────────────────────

function GenerationCard({
	gen,
	selected,
	onToggle
}: {
	gen: StudioGeneration;
	selected: boolean;
	onToggle: (id: string) => void;
}) {
	const topic = (gen as any).topic;
	const isApproved = gen.status === "approved";

	return (
		<div
			className="rounded-lg overflow-hidden flex flex-col relative"
			style={{
				border: selected
					? "2px solid oklch(0.62 0.14 140)"
					: "1px solid oklch(0.88 0.008 80)",
				background: "white"
			}}
		>
			{/* Checkbox overlay */}
			{!isApproved && (
				<button
					onClick={() => onToggle(gen.id)}
					className="absolute top-2 left-2 z-10 w-6 h-6 rounded flex items-center justify-center"
					style={{
						background: selected
							? "oklch(0.62 0.14 140)"
							: "rgba(255,255,255,0.85)",
						border: selected
							? "none"
							: "1.5px solid oklch(0.75 0.008 80)"
					}}
				>
					{selected && (
						<svg
							width="12"
							height="12"
							viewBox="0 0 12 12"
							fill="none"
						>
							<path
								d="M2 6l3 3 5-5"
								stroke="white"
								strokeWidth="1.8"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					)}
				</button>
			)}

			{/* Video / image preview */}
			<div
				className="relative"
				style={{
					aspectRatio: "16/9",
					background: "oklch(0.12 0.008 60)"
				}}
			>
				{gen.videoUrl ? (
					<video
						src={gen.videoUrl}
						className="absolute inset-0 w-full h-full object-cover"
						loop
						muted
						autoPlay
						playsInline
					/>
				) : gen.imageUrl ? (
					<img
						src={gen.imageUrl}
						alt=""
						className="absolute inset-0 w-full h-full object-cover"
					/>
				) : (
					<div
						className="absolute inset-0 flex items-center justify-center text-xs"
						style={{ color: "oklch(0.60 0.008 80)" }}
					>
						No preview
					</div>
				)}

				{isApproved && (
					<div
						className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium"
						style={{
							background: "oklch(0.62 0.14 140)",
							color: "white"
						}}
					>
						Approved
					</div>
				)}
			</div>

			{/* Info */}
			<div className="p-3 flex flex-col gap-1 flex-1">
				<p
					className="text-xs font-medium truncate"
					style={{
						color: "oklch(0.20 0.008 60)",
						fontFamily: "var(--font-sans)"
					}}
				>
					{topic?.topic ?? "Unknown topic"}
				</p>
				{gen.videoPrompt && (
					<p
						className="text-xs line-clamp-2"
						style={{ color: "oklch(0.55 0.010 60)" }}
					>
						{gen.videoPrompt}
					</p>
				)}
			</div>

			{/* Approved state */}
			{isApproved && gen.postId && (
				<div className="px-3 pb-3">
					<Link
						to="/creator/$id"
						params={{ id: gen.postId }}
						className="block w-full text-center py-1.5 rounded text-xs font-medium"
						style={{
							background: "oklch(0.94 0.025 55)",
							color: "oklch(0.45 0.10 60)"
						}}
					>
						Open in creator
					</Link>
				</div>
			)}
		</div>
	);
}

// ── Main grid ─────────────────────────────────────────────────────────────────

function ReviewGrid() {
	const queryClient = useQueryClient();
	const { data: gens } = useSuspenseQuery(studioReviewQueryOptions());
	const [selected, setSelected] = useState<string[]>([]);
	const [showSchedule, setShowSchedule] = useState(false);
	const [pendingAction, setPendingAction] = useState<
		"approve" | "reject" | null
	>(null);

	const readyGens = gens.filter((g) => g.status === "ready");

	const toggleSelect = (id: string) =>
		setSelected((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
		);

	const approveMutation = useMutation({
		mutationFn: (scheduledAt?: string) =>
			approveGenerationsFn({
				data: { ids: selected, scheduledAt }
			}),
		onSuccess: (data: any) => {
			const count = Array.isArray(data) ? data.length : selected.length;
			toast.success(`${count} draft post${count > 1 ? "s" : ""} created`);
			setSelected([]);
			setShowSchedule(false);
			setPendingAction(null);
			queryClient.invalidateQueries({ queryKey: ["studio-review"] });
			queryClient.invalidateQueries({ queryKey: ["studio-topics"] });
			queryClient.invalidateQueries({ queryKey: ["creator-posts"] });
		},
		onError: (e: any) => {
			toast.error(e?.message || "Failed to approve");
			setPendingAction(null);
		}
	});

	const rejectMutation = useMutation({
		mutationFn: () => rejectGenerationsFn({ data: { ids: selected } }),
		onSuccess: () => {
			toast.success("Rejected");
			setSelected([]);
			setPendingAction(null);
			queryClient.invalidateQueries({ queryKey: ["studio-review"] });
			queryClient.invalidateQueries({ queryKey: ["studio-topics"] });
		},
		onError: (e: any) => {
			toast.error(e?.message || "Failed to reject");
			setPendingAction(null);
		}
	});

	const isPending = approveMutation.isPending || rejectMutation.isPending;

	if (gens.length === 0) {
		return (
			<div
				className="rounded-lg border p-16 text-center"
				style={{
					borderColor: "oklch(0.88 0.008 80)",
					color: "oklch(0.50 0.010 60)"
				}}
			>
				<p className="text-sm">No generations ready for review.</p>
				<p className="text-xs mt-1">
					Run topics from the{" "}
					<Link
						to="/studio/topics"
						style={{ color: "oklch(0.62 0.14 47)" }}
					>
						Topics
					</Link>{" "}
					page to start generating.
				</p>
			</div>
		);
	}

	return (
		<>
			{showSchedule && (
				<ScheduleDialog
					count={selected.length}
					onClose={() => setShowSchedule(false)}
					onConfirm={(scheduledAt) =>
						approveMutation.mutate(scheduledAt)
					}
					isPending={approveMutation.isPending}
				/>
			)}

			<BulkBar
				selected={selected}
				total={readyGens.length}
				onSelectAll={() => setSelected(readyGens.map((g) => g.id))}
				onClearAll={() => setSelected([])}
				onApprove={() => setShowSchedule(true)}
				onReject={() => {
					setPendingAction("reject");
					rejectMutation.mutate();
				}}
				isPending={isPending}
			/>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{gens.map((gen) => (
					<GenerationCard
						key={gen.id}
						gen={gen}
						selected={selected.includes(gen.id)}
						onToggle={toggleSelect}
					/>
				))}
			</div>
		</>
	);
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ReviewSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{[...Array(6)].map((_, i) => (
				<div
					key={i}
					className="rounded-lg overflow-hidden"
					style={{ border: "1px solid oklch(0.88 0.008 80)" }}
				>
					<div
						className="w-full animate-pulse"
						style={{
							aspectRatio: "16/9",
							background: "oklch(0.90 0.008 80)"
						}}
					/>
					<div className="p-3 flex flex-col gap-2">
						<div
							className="h-3 rounded w-32 animate-pulse"
							style={{ background: "oklch(0.90 0.008 80)" }}
						/>
						<div
							className="h-3 rounded w-full animate-pulse"
							style={{ background: "oklch(0.90 0.008 80)" }}
						/>
					</div>
				</div>
			))}
		</div>
	);
}

// ── Page ──────────────────────────────────────────────────────────────────────

function ReviewPage() {
	return (
		<div
			className="px-8 py-8 md:px-14"
			style={{ background: "oklch(0.97 0.008 80)", minHeight: "100dvh" }}
		>
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1
						style={{
							fontFamily: "var(--font-heading)",
							fontWeight: 600,
							fontSize: "1.75rem",
							lineHeight: 1.1,
							letterSpacing: "-0.02em",
							color: "oklch(0.15 0.008 60)"
						}}
					>
						Review
					</h1>
					<p
						className="text-sm mt-1"
						style={{
							color: "oklch(0.50 0.010 60)",
							fontFamily: "var(--font-sans)"
						}}
					>
						Pick and approve generated backgrounds
					</p>
				</div>
				<Link
					to="/studio/topics"
					className="px-3 py-2 rounded-md text-sm"
					style={{
						background: "oklch(0.92 0.008 80)",
						color: "oklch(0.30 0.008 60)"
					}}
				>
					Topics
				</Link>
			</div>

			<Suspense fallback={<ReviewSkeleton />}>
				<ReviewGrid />
			</Suspense>
		</div>
	);
}
