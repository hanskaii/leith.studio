import { useState, useContext } from "react";
import {
	useSuspenseQuery,
	useMutation,
	useQueryClient
} from "@tanstack/react-query";
import { toast } from "@workspace/ui";
import { AppModalContext } from "@/routes/-components/providers/app-modal-provider";
import {
	studioTopicsQueryOptions,
	deleteTopicFn,
	triggerTopicFn,
	type StudioTopic
} from "@/routes/-fn/studio";

const STATUS_COLORS: Record<string, string> = {
	idle: "oklch(0.78 0.08 140)",
	generating: "oklch(0.78 0.12 60)",
	ready_for_review: "oklch(0.78 0.12 200)",
	approved: "oklch(0.62 0.14 140)",
	rejected: "oklch(0.62 0.14 20)"
};

function TopicRow({
	topic,
	onEdit,
	onDelete,
	onTrigger,
	isTriggering
}: {
	topic: StudioTopic;
	onEdit: (t: StudioTopic) => void;
	onDelete: (t: StudioTopic) => void;
	onTrigger: (id: string) => void;
	isTriggering: boolean;
}) {
	const genCount = (topic as any).generations?.length ?? 0;
	const canTrigger = topic.status === "idle" || topic.status === "rejected";

	return (
		<tr style={{ borderBottom: "1px solid oklch(0.88 0.008 80)" }}>
			<td
				className="px-4 py-3 text-sm"
				style={{
					color: "oklch(0.15 0.008 60)",
					fontFamily: "var(--font-sans)"
				}}
			>
				{topic.topic}
			</td>
			<td className="px-4 py-3">
				<span
					className="px-2 py-0.5 rounded text-xs font-medium"
					style={{
						background: `color-mix(in oklch, ${STATUS_COLORS[topic.status] ?? "oklch(0.78 0.008 80)"} 15%, white)`,
						color:
							STATUS_COLORS[topic.status] ??
							"oklch(0.50 0.010 60)"
					}}
				>
					{topic.status.replace(/_/g, " ")}
				</span>
			</td>
			<td
				className="px-4 py-3 text-sm text-center"
				style={{ color: "oklch(0.50 0.010 60)" }}
			>
				{genCount}
			</td>
			<td
				className="px-4 py-3 text-sm"
				style={{ color: "oklch(0.50 0.010 60)" }}
			>
				{topic.countOverride ?? "default"}
			</td>
			<td className="px-4 py-3">
				<div className="flex items-center gap-2">
					{canTrigger && (
						<button
							onClick={() => onTrigger(topic.id)}
							disabled={isTriggering}
							className="px-2 py-1 rounded text-xs font-medium disabled:opacity-50"
							style={{
								background: "oklch(0.62 0.14 47)",
								color: "oklch(0.97 0.008 80)"
							}}
						>
							Run
						</button>
					)}
					<button
						onClick={() => onEdit(topic)}
						className="px-2 py-1 rounded text-xs"
						style={{
							background: "oklch(0.92 0.008 80)",
							color: "oklch(0.30 0.008 60)"
						}}
					>
						Edit
					</button>
					<button
						onClick={() => onDelete(topic)}
						className="px-2 py-1 rounded text-xs"
						style={{
							background: "oklch(0.92 0.010 20)",
							color: "oklch(0.45 0.14 20)"
						}}
					>
						Delete
					</button>
				</div>
			</td>
		</tr>
	);
}

export function TopicsTable() {
	const queryClient = useQueryClient();
	const { openTopicModal } = useContext(AppModalContext);
	const { data: topics } = useSuspenseQuery(studioTopicsQueryOptions());
	const [deleteTarget, setDeleteTarget] = useState<StudioTopic | null>(null);

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteTopicFn({ data: { data: id } }),
		onSuccess: () => {
			toast.success("Topic deleted");
			setDeleteTarget(null);
			queryClient.invalidateQueries({ queryKey: ["studio-topics"] });
		},
		onError: (e: any) => toast.error(e?.message || "Failed to delete topic")
	});

	const triggerMutation = useMutation({
		mutationFn: (id: string) => triggerTopicFn({ data: { data: id } }),
		onSuccess: () => {
			toast.success("Generation started");
			queryClient.invalidateQueries({ queryKey: ["studio-topics"] });
		},
		onError: (e: any) => toast.error(e?.message || "Failed to trigger")
	});

	return (
		<>
			{deleteTarget && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center"
					style={{ background: "rgba(0,0,0,0.4)" }}
				>
					<div
						className="w-full max-w-sm rounded-lg p-6"
						style={{
							background: "oklch(0.99 0.002 80)",
							border: "1px solid oklch(0.88 0.008 80)"
						}}
					>
						<p
							className="text-sm mb-4"
							style={{ color: "oklch(0.20 0.008 60)" }}
						>
							Delete topic <strong>"{deleteTarget.topic}"</strong>
							? This will also delete all associated generations.
						</p>
						<div className="flex justify-end gap-2">
							<button
								onClick={() => setDeleteTarget(null)}
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
									deleteMutation.mutate(deleteTarget.id)
								}
								className="px-3 py-1.5 rounded text-sm font-medium"
								style={{
									background: "oklch(0.55 0.18 20)",
									color: "white"
								}}
							>
								Delete
							</button>
						</div>
					</div>
				</div>
			)}

			<div
				className="overflow-x-auto rounded-md border"
				style={{ borderColor: "oklch(0.88 0.008 80)" }}
			>
				<table
					className="w-full text-sm"
					style={{ fontFamily: "var(--font-sans)" }}
				>
					<thead>
						<tr
							style={{
								borderBottom: "1px solid oklch(0.88 0.008 80)",
								background: "oklch(0.94 0.025 55)"
							}}
						>
							{[
								"Topic",
								"Status",
								"Gens",
								"Count",
								"Actions"
							].map((h) => (
								<th
									key={h}
									className="px-4 py-3 text-left text-xs font-medium"
									style={{ color: "oklch(0.50 0.010 60)" }}
								>
									{h}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{topics.map((topic) => (
							<TopicRow
								key={topic.id}
								topic={topic}
								onEdit={openTopicModal}
								onDelete={setDeleteTarget}
								onTrigger={(id) => triggerMutation.mutate(id)}
								isTriggering={triggerMutation.isPending}
							/>
						))}
						{topics.length === 0 && (
							<tr>
								<td
									colSpan={5}
									className="px-4 py-10 text-center text-sm"
									style={{ color: "oklch(0.50 0.010 60)" }}
								>
									No topics yet. Add one to get started.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</>
	);
}
