import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import {
	useSuspenseQuery,
	useMutation,
	useQueryClient
} from "@tanstack/react-query";
import { Suspense, useState, useEffect } from "react";
import { Gate } from "@workspace/core";
import { toast } from "@workspace/ui";
import {
	studioSettingsQueryOptions,
	updateSettingsFn,
	type StudioSettings
} from "@/routes/-fn/studio";

export const Route = createFileRoute("/(app)/_app/studio/settings/")({
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
	component: SettingsPage
});

const IMAGE_MODELS = [
	"nano-banana",
	"nano-banana-2",
	"nano-banana-pro",
	"qwen-image",
	"seedream-4.0",
	"seedream-4.5",
	"seedream-5.0-lite",
	"kling-3.0",
	"kling-o3",
	"gpt-image-2.0"
];

const VIDEO_MODELS = [
	"kling-v3",
	"kling-o3",
	"veo-3.1-fast",
	"veo-3.1-quality",
	"veo-3.1-lite",
	"v6",
	"v5.6",
	"pixverse-c1",
	"seedance-2.0",
	"seedance-2.0-fast",
	"sora-2",
	"happyhorse-1.0"
];

function SettingsForm({ settings }: { settings: StudioSettings | null }) {
	const queryClient = useQueryClient();

	const [form, setForm] = useState({
		defaultImageModel: settings?.defaultImageModel ?? "nano-banana-2",
		defaultVideoModel: settings?.defaultVideoModel ?? "kling-v3",
		defaultCount: settings?.defaultCount?.toString() ?? "3",
		globalReferenceImageUrl: settings?.globalReferenceImageUrl ?? "",
		imagePromptTemplate: settings?.imagePromptTemplate ?? "",
		videoPromptTemplate: settings?.videoPromptTemplate ?? ""
	});

	useEffect(() => {
		if (settings) {
			setForm({
				defaultImageModel: settings.defaultImageModel,
				defaultVideoModel: settings.defaultVideoModel,
				defaultCount: settings.defaultCount.toString(),
				globalReferenceImageUrl: settings.globalReferenceImageUrl ?? "",
				imagePromptTemplate: settings.imagePromptTemplate,
				videoPromptTemplate: settings.videoPromptTemplate
			});
		}
	}, [settings]);

	const mutation = useMutation({
		mutationFn: (data: any) => updateSettingsFn({ data: { data } }),
		onSuccess: () => {
			toast.success("Settings saved");
			queryClient.invalidateQueries({ queryKey: ["studio-settings"] });
		},
		onError: (e: any) =>
			toast.error(e?.message || "Failed to save settings")
	});

	const handleSave = () => {
		mutation.mutate({
			defaultImageModel: form.defaultImageModel,
			defaultVideoModel: form.defaultVideoModel,
			defaultCount: parseInt(form.defaultCount) || 3,
			globalReferenceImageUrl: form.globalReferenceImageUrl || null,
			imagePromptTemplate: form.imagePromptTemplate || undefined,
			videoPromptTemplate: form.videoPromptTemplate || undefined
		});
	};

	const inputStyle = {
		borderColor: "oklch(0.85 0.008 80)",
		color: "oklch(0.15 0.008 60)",
		background: "white",
		fontFamily: "var(--font-sans)"
	};

	const labelStyle = {
		color: "oklch(0.40 0.010 60)",
		fontFamily: "var(--font-sans)"
	};

	return (
		<div className="max-w-2xl flex flex-col gap-6">
			{/* Models */}
			<section>
				<h2
					className="text-sm font-semibold mb-3"
					style={{
						color: "oklch(0.25 0.008 60)",
						fontFamily: "var(--font-heading)"
					}}
				>
					Default models
				</h2>
				<div className="grid grid-cols-2 gap-4">
					<div>
						<label
							className="mb-1 block text-xs font-medium"
							style={labelStyle}
						>
							Image model
						</label>
						<select
							className="w-full rounded border px-3 py-2 text-sm outline-none"
							style={inputStyle}
							value={form.defaultImageModel}
							onChange={(e) =>
								setForm((p) => ({
									...p,
									defaultImageModel: e.target.value
								}))
							}
						>
							{IMAGE_MODELS.map((m) => (
								<option key={m} value={m}>
									{m}
								</option>
							))}
						</select>
					</div>
					<div>
						<label
							className="mb-1 block text-xs font-medium"
							style={labelStyle}
						>
							Video model
						</label>
						<select
							className="w-full rounded border px-3 py-2 text-sm outline-none"
							style={inputStyle}
							value={form.defaultVideoModel}
							onChange={(e) =>
								setForm((p) => ({
									...p,
									defaultVideoModel: e.target.value
								}))
							}
						>
							{VIDEO_MODELS.map((m) => (
								<option key={m} value={m}>
									{m}
								</option>
							))}
						</select>
					</div>
				</div>
			</section>

			{/* Count */}
			<section>
				<h2
					className="text-sm font-semibold mb-3"
					style={{
						color: "oklch(0.25 0.008 60)",
						fontFamily: "var(--font-heading)"
					}}
				>
					Generation count
				</h2>
				<div className="flex items-center gap-3">
					<input
						type="number"
						min="1"
						max="10"
						className="w-24 rounded border px-3 py-2 text-sm outline-none"
						style={inputStyle}
						value={form.defaultCount}
						onChange={(e) =>
							setForm((p) => ({
								...p,
								defaultCount: e.target.value
							}))
						}
					/>
					<span
						className="text-xs"
						style={{ color: "oklch(0.50 0.010 60)" }}
					>
						videos generated per topic per cron run
					</span>
				</div>
			</section>

			{/* Reference image */}
			<section>
				<h2
					className="text-sm font-semibold mb-1"
					style={{
						color: "oklch(0.25 0.008 60)",
						fontFamily: "var(--font-heading)"
					}}
				>
					Global reference image
				</h2>
				<p
					className="text-xs mb-3"
					style={{ color: "oklch(0.55 0.010 60)" }}
				>
					Style reference applied to all topics unless overridden
					per-topic.
				</p>
				<input
					className="w-full rounded border px-3 py-2 text-sm outline-none"
					style={inputStyle}
					value={form.globalReferenceImageUrl}
					onChange={(e) =>
						setForm((p) => ({
							...p,
							globalReferenceImageUrl: e.target.value
						}))
					}
					placeholder="https://... (public image URL)"
				/>
			</section>

			{/* Prompt templates */}
			<section>
				<h2
					className="text-sm font-semibold mb-1"
					style={{
						color: "oklch(0.25 0.008 60)",
						fontFamily: "var(--font-heading)"
					}}
				>
					Image prompt template
				</h2>
				<p
					className="text-xs mb-3"
					style={{ color: "oklch(0.55 0.010 60)" }}
				>
					Use{" "}
					<code
						style={{
							background: "oklch(0.93 0.008 80)",
							padding: "0 3px",
							borderRadius: 3
						}}
					>
						{"{topic}"}
					</code>{" "}
					as placeholder for the topic keyword.
				</p>
				<textarea
					rows={6}
					className="w-full rounded border px-3 py-2 text-sm outline-none font-mono resize-y"
					style={{ ...inputStyle, fontSize: "0.75rem" }}
					value={form.imagePromptTemplate}
					onChange={(e) =>
						setForm((p) => ({
							...p,
							imagePromptTemplate: e.target.value
						}))
					}
				/>
			</section>

			<section>
				<h2
					className="text-sm font-semibold mb-1"
					style={{
						color: "oklch(0.25 0.008 60)",
						fontFamily: "var(--font-heading)"
					}}
				>
					Video prompt template
				</h2>
				<p
					className="text-xs mb-3"
					style={{ color: "oklch(0.55 0.010 60)" }}
				>
					Use{" "}
					<code
						style={{
							background: "oklch(0.93 0.008 80)",
							padding: "0 3px",
							borderRadius: 3
						}}
					>
						{"{image_prompt}"}
					</code>{" "}
					as placeholder for the generated image prompt.
				</p>
				<textarea
					rows={6}
					className="w-full rounded border px-3 py-2 text-sm outline-none font-mono resize-y"
					style={{ ...inputStyle, fontSize: "0.75rem" }}
					value={form.videoPromptTemplate}
					onChange={(e) =>
						setForm((p) => ({
							...p,
							videoPromptTemplate: e.target.value
						}))
					}
				/>
			</section>

			<div className="flex justify-end">
				<button
					onClick={handleSave}
					disabled={mutation.isPending}
					className="px-5 py-2 rounded-md text-sm font-medium disabled:opacity-50"
					style={{
						background: "oklch(0.62 0.14 47)",
						color: "oklch(0.97 0.008 80)"
					}}
				>
					{mutation.isPending ? "Saving..." : "Save settings"}
				</button>
			</div>
		</div>
	);
}

function SettingsContent() {
	const { data: settings } = useSuspenseQuery(studioSettingsQueryOptions());
	return <SettingsForm settings={settings} />;
}

function SettingsSkeleton() {
	return (
		<div className="max-w-2xl flex flex-col gap-6">
			{[...Array(4)].map((_, i) => (
				<div key={i} className="flex flex-col gap-2">
					<div
						className="h-4 rounded w-32 animate-pulse"
						style={{ background: "oklch(0.90 0.008 80)" }}
					/>
					<div
						className="h-9 rounded animate-pulse"
						style={{ background: "oklch(0.90 0.008 80)" }}
					/>
				</div>
			))}
		</div>
	);
}

function SettingsPage() {
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
						Studio settings
					</h1>
					<p
						className="text-sm mt-1"
						style={{
							color: "oklch(0.50 0.010 60)",
							fontFamily: "var(--font-sans)"
						}}
					>
						Global defaults for auto-generation
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

			<Suspense fallback={<SettingsSkeleton />}>
				<SettingsContent />
			</Suspense>
		</div>
	);
}
