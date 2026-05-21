import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
	useSuspenseQuery,
	useMutation,
	useQueryClient
} from "@tanstack/react-query";
import { toast } from "@workspace/ui";
import {
	studioReviewQueryOptions,
	approveGenerationsFn,
	rejectGenerationsFn
} from "@/routes/-fn/studio";
import { BulkBar } from "./bulk-bar";
import { ScheduleDialog } from "./schedule-dialog";
import { GenerationCard } from "./generation-card";

export function ReviewGrid() {
	const queryClient = useQueryClient();
	const { data: gens } = useSuspenseQuery(studioReviewQueryOptions());
	const [selected, setSelected] = useState<string[]>([]);
	const [showSchedule, setShowSchedule] = useState(false);
	const [pendingAction, setPendingAction] = useState<
		"approve" | "reject" | null
	>(null);

	const readyGens = gens.filter((g) => g.status === "pending_review");

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
					Open the{" "}
					<Link
						to="/studio/agent"
						style={{ color: "oklch(0.62 0.14 47)" }}
					>
						Studio Agent
					</Link>{" "}
					to start generating.
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
