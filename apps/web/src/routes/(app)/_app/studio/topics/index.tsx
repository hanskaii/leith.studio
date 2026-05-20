import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	useSuspenseQuery,
	useMutation,
	useQueryClient
} from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Gate } from "@workspace/core";
import { toast } from "@workspace/ui";
import {
	studioTopicsQueryOptions,
	createTopicFn,
	updateTopicFn,
	deleteTopicFn,
	triggerTopicFn,
	type StudioTopic
} from "@/routes/-fn/studio";

export const Route = createFileRoute("/(app)/_app/studio/topics/")({
	beforeLoad: async ({ context }) => {
		const result = await Gate.can("content.manage", {
			actor: context.session.user
		});
		if (!result.allowed) {
			throw redirect({
				to: "/feed",
				search: { page: 1, type: "all", sort: "newest" }
			});
		}
	},
	component: TopicsPage
});

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

const TopicSchema = z.object({
	topic: z.string().min(1, "Topic is required").max(200),
	referenceImageUrl: z.string().url("Must be a valid URL").or(z.literal("")),
	countOverride: z.number().int().min(1).max(10).optional()
});

type TopicValues = z.infer<typeof TopicSchema>;

function TopicFormDialog({
	topic,
	onClose,
	onSuccess
}: {
	topic?: StudioTopic | null;
	onClose: () => void;
	onSuccess: () => void;
}) {
	const queryClient = useQueryClient();

	const createMutation = useMutation({
		mutationFn: (data: TopicValues) =>
			createTopicFn({
				data: {
					data: {
						topic: data.topic,
						referenceImageUrl: data.referenceImageUrl || undefined,
						countOverride: data.countOverride
					}
				}
			}),
		onSuccess: () => {
			toast.success("Topic created");
			queryClient.invalidateQueries({ queryKey: ["studio-topics"] });
			onSuccess();
		},
		onError: (e: any) => toast.error(e?.message || "Failed to create topic")
	});

	const updateMutation = useMutation({
		mutationFn: (data: TopicValues) =>
			updateTopicFn({
				data: {
					data: {
						id: topic!.id,
						data: {
							topic: data.topic,
							referenceImageUrl:
								data.referenceImageUrl || undefined,
							countOverride: data.countOverride
						}
					}
				}
			}),
		onSuccess: () => {
			toast.success("Topic updated");
			queryClient.invalidateQueries({ queryKey: ["studio-topics"] });
			onSuccess();
		},
		onError: (e: any) => toast.error(e?.message || "Failed to update topic")
	});

	const isPending = createMutation.isPending || updateMutation.isPending;

	const form = useForm({
		defaultValues: {
			topic: topic?.topic ?? "",
			referenceImageUrl: topic?.referenceImageUrl ?? "",
			countOverride: topic?.countOverride ?? undefined
		} as TopicValues,
		onSubmit: async ({ value }) => {
			if (topic) {
				await updateMutation.mutateAsync(value);
			} else {
				await createMutation.mutateAsync(value);
			}
		}
	});

	const inputStyle = {
		borderColor: "oklch(0.85 0.008 80)",
		color: "oklch(0.15 0.008 60)",
		background: "white"
	};

	const labelStyle = { color: "oklch(0.40 0.010 60)" };
	const errorStyle = {
		color: "oklch(0.55 0.18 20)",
		fontSize: "0.7rem",
		marginTop: "2px"
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center"
			style={{ background: "rgba(0,0,0,0.4)" }}
		>
			<div
				className="w-full max-w-md rounded-lg p-6"
				style={{
					background: "oklch(0.99 0.002 80)",
					border: "1px solid oklch(0.88 0.008 80)"
				}}
			>
				<h2
					className="mb-4 text-lg font-semibold"
					style={{
						fontFamily: "var(--font-heading)",
						color: "oklch(0.15 0.008 60)"
					}}
				>
					{topic ? "Edit topic" : "New topic"}
				</h2>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="flex flex-col gap-3"
				>
					<form.Field
						name="topic"
						validators={{
							onChange: ({ value }) => {
								const r = z
									.string()
									.min(1)
									.max(200)
									.safeParse(value);
								return r.success
									? undefined
									: r.error.issues[0]?.message;
							}
						}}
					>
						{(field) => (
							<div>
								<label
									className="mb-1 block text-xs font-medium"
									style={labelStyle}
								>
									Topic / keyword *
								</label>
								<input
									className="w-full rounded border px-3 py-2 text-sm outline-none"
									style={inputStyle}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) =>
										field.handleChange(e.target.value)
									}
									placeholder="e.g. cozy lofi room, dark fantasy forest"
									disabled={isPending}
								/>
								{field.state.meta.isTouched &&
									!field.state.meta.isValid && (
										<p style={errorStyle}>
											{field.state.meta.errors[0]}
										</p>
									)}
							</div>
						)}
					</form.Field>

					<form.Field
						name="referenceImageUrl"
						validators={{
							onChange: ({ value }) => {
								if (!value) return undefined;
								const r = z.string().url().safeParse(value);
								return r.success
									? undefined
									: r.error.issues[0]?.message;
							}
						}}
					>
						{(field) => (
							<div>
								<label
									className="mb-1 block text-xs font-medium"
									style={labelStyle}
								>
									Reference image URL (overrides global)
								</label>
								<input
									className="w-full rounded border px-3 py-2 text-sm outline-none"
									style={inputStyle}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) =>
										field.handleChange(e.target.value)
									}
									placeholder="https://..."
									disabled={isPending}
								/>
								{field.state.meta.isTouched &&
									!field.state.meta.isValid && (
										<p style={errorStyle}>
											{field.state.meta.errors[0]}
										</p>
									)}
							</div>
						)}
					</form.Field>

					<form.Field
						name="countOverride"
						validators={{
							onChange: ({ value }) => {
								if (value === undefined) return undefined;
								const r = z
									.number()
									.int()
									.min(1)
									.max(10)
									.safeParse(value);
								return r.success
									? undefined
									: r.error.issues[0]?.message;
							}
						}}
					>
						{(field) => (
							<div>
								<label
									className="mb-1 block text-xs font-medium"
									style={labelStyle}
								>
									Count override (default: from settings)
								</label>
								<input
									type="number"
									min="1"
									max="10"
									className="w-full rounded border px-3 py-2 text-sm outline-none"
									style={inputStyle}
									value={field.state.value ?? ""}
									onBlur={field.handleBlur}
									onChange={(e) => {
										const v = e.target.value;
										field.handleChange(
											v ? parseInt(v) : undefined
										);
									}}
									placeholder="3"
									disabled={isPending}
								/>
								{field.state.meta.isTouched &&
									!field.state.meta.isValid && (
										<p style={errorStyle}>
											{field.state.meta.errors[0]}
										</p>
									)}
							</div>
						)}
					</form.Field>

					<div className="mt-2 flex justify-end gap-2">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 rounded text-sm"
							style={{
								background: "oklch(0.92 0.008 80)",
								color: "oklch(0.30 0.008 60)"
							}}
						>
							Cancel
						</button>
						<form.Subscribe selector={(s) => s.canSubmit}>
							{(canSubmit) => (
								<button
									type="submit"
									disabled={!canSubmit || isPending}
									className="px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
									style={{
										background: "oklch(0.62 0.14 47)",
										color: "oklch(0.97 0.008 80)"
									}}
								>
									{isPending ? "Saving..." : "Save"}
								</button>
							)}
						</form.Subscribe>
					</div>
				</form>
			</div>
		</div>
	);
}

function TopicsTable() {
	const queryClient = useQueryClient();
	const { data: topics } = useSuspenseQuery(studioTopicsQueryOptions());
	const [editTarget, setEditTarget] = useState<StudioTopic | null>(null);
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
			{editTarget !== null && (
				<TopicFormDialog
					topic={editTarget}
					onClose={() => setEditTarget(null)}
					onSuccess={() => setEditTarget(null)}
				/>
			)}

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
								onEdit={setEditTarget}
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

function TopicsSkeleton() {
	return (
		<div
			className="rounded-md border overflow-hidden"
			style={{ borderColor: "oklch(0.88 0.008 80)" }}
		>
			{[...Array(3)].map((_, i) => (
				<div
					key={i}
					className="flex gap-4 px-4 py-3 border-b"
					style={{ borderColor: "oklch(0.88 0.008 80)" }}
				>
					<div
						className="h-4 rounded w-48 animate-pulse"
						style={{ background: "oklch(0.90 0.008 80)" }}
					/>
					<div
						className="h-4 rounded w-20 animate-pulse"
						style={{ background: "oklch(0.90 0.008 80)" }}
					/>
				</div>
			))}
		</div>
	);
}

function TopicsPage() {
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
						Topics
					</h1>
					<p
						className="text-sm mt-1"
						style={{
							color: "oklch(0.50 0.010 60)",
							fontFamily: "var(--font-sans)"
						}}
					>
						Auto-generate background assets from topics
					</p>
				</div>
				<div className="flex gap-2">
					<a
						href="/studio/settings"
						className="px-3 py-2 rounded-md text-sm"
						style={{
							background: "oklch(0.92 0.008 80)",
							color: "oklch(0.30 0.008 60)"
						}}
					>
						Settings
					</a>
					<a
						href="/studio/review"
						className="px-3 py-2 rounded-md text-sm"
						style={{
							background: "oklch(0.92 0.008 80)",
							color: "oklch(0.30 0.008 60)"
						}}
					>
						Review
					</a>
				</div>
			</div>

			<Suspense fallback={<TopicsSkeleton />}>
				<TopicsTableWithAdd />
			</Suspense>
		</div>
	);
}

function TopicsTableWithAdd() {
	const [showForm, setShowForm] = useState(false);

	return (
		<>
			{showForm && (
				<TopicFormDialog
					onClose={() => setShowForm(false)}
					onSuccess={() => setShowForm(false)}
				/>
			)}
			<div className="flex justify-end mb-3">
				<button
					onClick={() => setShowForm(true)}
					className="px-4 py-2 rounded-md text-sm font-medium"
					style={{
						background: "oklch(0.62 0.14 47)",
						color: "oklch(0.97 0.008 80)"
					}}
				>
					Add topic
				</button>
			</div>
			<TopicsTable />
		</>
	);
}
