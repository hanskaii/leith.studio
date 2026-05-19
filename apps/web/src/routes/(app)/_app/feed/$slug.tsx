import { createFileRoute, Link } from "@tanstack/react-router";
import {
	useSuspenseQuery,
	useMutation,
	useQueryClient
} from "@tanstack/react-query";
import { Suspense } from "react";
import { toast } from "@workspace/ui";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { postQueryOptions, downloadAssetFn } from "@/routes/-fn/posts";
import { sessionsOptions } from "@/routes/-fn/auth";
import { z } from "zod";

const postSearchSchema = z.object({
	page: z.coerce.number().min(1).optional(),
	tag: z.string().optional()
});

export const Route = createFileRoute("/(app)/_app/feed/$slug")({
	validateSearch: (s) => postSearchSchema.parse(s),
	component: PostPage
});

function formatDate(d: string | number | Date | null | undefined): string {
	if (!d) return "";
	const date = new Date(d);
	return date.toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
		year: "numeric"
	});
}

function formatFileSize(bytes: number | null | undefined): string {
	if (!bytes) return "";
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number | null | undefined): string {
	if (!seconds) return "";
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}:${String(s).padStart(2, "0")}`;
}

function PostSkeleton() {
	return (
		<div className="max-w-[68ch] mx-auto flex flex-col gap-4 animate-pulse">
			<div
				className="aspect-[16/9] rounded-md"
				style={{ background: "oklch(0.92 0.006 80)" }}
			/>
			<div
				className="h-8 rounded"
				style={{ background: "oklch(0.92 0.006 80)", width: "70%" }}
			/>
			<div
				className="h-4 rounded"
				style={{ background: "oklch(0.92 0.006 80)", width: "40%" }}
			/>
		</div>
	);
}

function AssetSpecTable({ post }: { post: any }) {
	const rows = [
		{ label: "Format", value: post.format?.toUpperCase() },
		{ label: "Resolution", value: post.resolution },
		post.duration != null
			? { label: "Duration", value: formatDuration(post.duration) }
			: null,
		post.isLoop ? { label: "Loop", value: "Seamless" } : null,
		{ label: "File size", value: formatFileSize(post.fileSize) },
		{
			label: "Access",
			value: post.access === "free" ? "Free" : "All Access"
		}
	].filter(Boolean) as { label: string; value: string }[];

	return (
		<div
			className="rounded-md border overflow-hidden mt-8 mb-8"
			style={{ borderColor: "oklch(0.88 0.008 80)" }}
		>
			<div
				className="px-4 py-2 text-xs font-medium"
				style={{
					background: "oklch(0.94 0.025 55)",
					color: "oklch(0.50 0.010 60)",
					fontFamily: "var(--font-sans)",
					letterSpacing: "0.04em",
					textTransform: "uppercase"
				}}
			>
				Specifications
			</div>
			{rows.map((row) => (
				<div
					key={row.label}
					className="flex items-center justify-between px-4 py-2.5 border-t"
					style={{ borderColor: "oklch(0.92 0.006 80)" }}
				>
					<span
						className="text-xs"
						style={{
							color: "oklch(0.50 0.010 60)",
							fontFamily: "var(--font-sans)"
						}}
					>
						{row.label}
					</span>
					<span
						className="text-xs font-medium"
						style={{
							color: "oklch(0.15 0.008 60)",
							fontFamily: "var(--font-sans)"
						}}
					>
						{row.value}
					</span>
				</div>
			))}
		</div>
	);
}

function DownloadButton({
	slug,
	access,
	userRole
}: {
	slug: string;
	access: "free" | "premium";
	userRole: string | null | undefined;
}) {
	const canDownload =
		access === "free" || userRole === "member" || userRole === "admin";

	const mutation = useMutation({
		mutationFn: async () => {
			const res = await downloadAssetFn({ data: { data: slug } });
			if (!res.ok) throw new Error("Download failed");
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = slug;
			a.click();
			URL.revokeObjectURL(url);
		},
		onError: () => toast.error("Download failed. Please try again.")
	});

	if (!canDownload) {
		return (
			<a
				href={import.meta.env.VITE_DODO_CHECKOUT_URL}
				className="inline-flex items-center px-6 py-2.5 rounded-md text-sm font-medium transition-all"
				style={{
					background: "oklch(0.62 0.14 47)",
					color: "oklch(0.97 0.008 80)",
					fontFamily: "var(--font-sans)"
				}}
			>
				Get All Access
			</a>
		);
	}

	return (
		<button
			type="button"
			onClick={() => mutation.mutate()}
			disabled={mutation.isPending}
			className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-medium transition-all disabled:opacity-60"
			style={{
				background: "oklch(0.62 0.14 47)",
				color: "oklch(0.97 0.008 80)",
				fontFamily: "var(--font-sans)"
			}}
		>
			{mutation.isPending ? (
				<>
					<svg
						className="animate-spin h-4 w-4"
						viewBox="0 0 24 24"
						fill="none"
					>
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						/>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8v8z"
						/>
					</svg>
					Downloading...
				</>
			) : (
				<>
					<svg
						className="h-4 w-4"
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
					>
						<path d="M8 2v8M5 7l3 3 3-3M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" />
					</svg>
					Download
				</>
			)}
		</button>
	);
}

function PostContent({ slug }: { slug: string }) {
	const { data: post } = useSuspenseQuery(postQueryOptions(slug));
	const { data: session } = useSuspenseQuery(sessionsOptions());

	let content: any = null;
	if (post?.body) {
		try {
			content = JSON.parse(post.body as string);
		} catch {
			content = null;
		}
	}

	const editor = useEditor({
		extensions: [StarterKit, Image],
		content,
		editable: false
	});

	if (!post) return null;

	const hasAsset = !!(post as any).format;
	const postFormat = (post as any).format as string | undefined;
	const fileUrl = (post as any).fileUrl as string | null | undefined;
	const isVideo = !!postFormat && ["mp4", "webm"].includes(postFormat);

	return (
		<article className="max-w-[68ch] mx-auto">
			{isVideo && fileUrl ? (
				<video
					autoPlay
					muted
					loop
					playsInline
					controls
					src={fileUrl}
					className="w-full aspect-[16/9] rounded-md overflow-hidden object-cover mb-8"
				/>
			) : (
				post.coverImage && (
					<div className="w-full aspect-[16/9] rounded-md overflow-hidden mb-8">
						<img
							src={post.coverImage}
							alt={post.title}
							className="w-full h-full object-cover"
						/>
					</div>
				)
			)}

			<header className="mb-8">
				<div className="flex flex-wrap gap-1.5 mb-4">
					{Array.isArray(post.tags) &&
						post.tags.map((tag) => (
							<span
								key={tag}
								className="rounded px-1.5 py-0.5"
								style={{
									background: "oklch(0.94 0.025 55)",
									color: "oklch(0.52 0.14 47)",
									fontSize: "0.6875rem",
									fontFamily: "var(--font-sans)",
									fontWeight: 500,
									letterSpacing: "0.01em"
								}}
							>
								{tag}
							</span>
						))}
				</div>

				<h1
					style={{
						fontFamily: "var(--font-heading)",
						fontWeight: 600,
						fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
						lineHeight: 1.05,
						letterSpacing: "-0.025em",
						color: "oklch(0.15 0.008 60)"
					}}
				>
					{post.title}
				</h1>

				{post.publishedAt && (
					<time
						className="block mt-3 text-sm"
						style={{
							color: "oklch(0.50 0.010 60)",
							fontFamily: "var(--font-sans)"
						}}
					>
						{formatDate(post.publishedAt)}
					</time>
				)}
			</header>

			{hasAsset && <AssetSpecTable post={post} />}

			{hasAsset && (
				<div className="mb-10">
					<DownloadButton
						slug={slug}
						access={(post as any).access}
						userRole={session?.user?.role}
					/>
				</div>
			)}

			{editor && (
				<div
					className="prose-leith"
					style={{ fontFamily: "var(--font-sans)", lineHeight: 1.65 }}
				>
					<EditorContent editor={editor} />
				</div>
			)}
		</article>
	);
}

function PostPage() {
	const { slug } = Route.useParams();
	const { page, tag } = Route.useSearch();

	const backSearch = Object.fromEntries(
		Object.entries({ page, tag }).filter(([, v]) => v != null)
	);

	return (
		<div
			className="min-h-[100dvh] px-6 py-10 md:px-14"
			style={{ background: "oklch(0.97 0.008 80)" }}
		>
			<div className="mb-8">
				<Link
					to="/feed"
					search={backSearch}
					className="text-sm inline-flex items-center gap-1.5 transition-colors"
					style={{
						color: "oklch(0.50 0.010 60)",
						fontFamily: "var(--font-sans)"
					}}
				>
					&larr; Back to feed
				</Link>
			</div>

			<Suspense fallback={<PostSkeleton />}>
				<PostContent slug={slug} />
			</Suspense>
		</div>
	);
}
