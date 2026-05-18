import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { Gate } from "@workspace/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { postQueryOptions } from "@/routes/-fn/posts";
import { z } from "zod";

const postSearchSchema = z.object({
	page: z.coerce.number().min(1).optional(),
	tag: z.string().optional()
});

export const Route = createFileRoute("/(app)/_app/feed/$slug")({
	validateSearch: (s) => postSearchSchema.parse(s),
	beforeLoad: async ({ context }) => {
		const result = await Gate.can("content.read", {
			actor: context.session.user
		});
		if (!result.allowed) {
			throw redirect({ to: "/activate" });
		}
	},
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

function PostContent({ slug }: { slug: string }) {
	const { data: post } = useSuspenseQuery(postQueryOptions(slug));

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

	return (
		<article className="max-w-[68ch] mx-auto">
			{post.coverImage && (
				<div className="w-full aspect-[16/9] rounded-md overflow-hidden mb-8">
					<img
						src={post.coverImage}
						alt={post.title}
						className="w-full h-full object-cover"
					/>
				</div>
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

			{editor && (
				<div
					className="prose-funnnit"
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
