import { Link } from "@tanstack/react-router";
import { type CreatorPost } from "@/routes/-fn/creator";
import { formatDate } from "@/routes/-lib/format";
import { StatusBadge } from "./status-badge";

type Props = {
	post: CreatorPost;
	onPublish: (id: string, status: "draft" | "published") => void;
	onDelete: (post: CreatorPost) => void;
	isUpdating: boolean;
};

export function PostRow({ post, onPublish, onDelete, isUpdating }: Props) {
	return (
		<tr style={{ borderBottom: "1px solid oklch(0.92 0.006 80)" }}>
			<td
				className="px-4 py-3"
				style={{
					color: "oklch(0.15 0.008 60)",
					maxWidth: "300px"
				}}
			>
				<span className="block truncate font-medium">{post.title}</span>
				<span
					className="text-xs"
					style={{ color: "oklch(0.50 0.010 60)" }}
				>
					/{post.slug}
				</span>
			</td>
			<td className="px-4 py-3">
				<StatusBadge status={post.status} />
			</td>
			<td
				className="px-4 py-3 text-xs"
				style={{ color: "oklch(0.50 0.010 60)" }}
			>
				{formatDate(post.publishedAt)}
			</td>
			<td className="px-4 py-3">
				<div className="flex items-center gap-2">
					<Link
						to="/creator/$id"
						params={{ id: post.id }}
						className="text-xs px-2.5 py-1 rounded border transition-all hover:border-[oklch(0.62_0.14_47)]"
						style={{
							borderColor: "oklch(0.88 0.008 80)",
							color: "oklch(0.15 0.008 60)"
						}}
					>
						Edit
					</Link>
					{post.status === "draft" ? (
						<button
							onClick={() => onPublish(post.id, "published")}
							disabled={isUpdating}
							className="text-xs px-2.5 py-1 rounded transition-all disabled:opacity-50"
							style={{
								background: "oklch(0.62 0.14 47)",
								color: "oklch(0.97 0.008 80)"
							}}
						>
							Publish
						</button>
					) : (
						<button
							onClick={() => onPublish(post.id, "draft")}
							disabled={isUpdating}
							className="text-xs px-2.5 py-1 rounded border transition-all disabled:opacity-50"
							style={{
								borderColor: "oklch(0.88 0.008 80)",
								color: "oklch(0.50 0.010 60)"
							}}
						>
							Unpublish
						</button>
					)}
					{post.status === "draft" && (
						<button
							onClick={() => onDelete(post)}
							className="text-xs px-2.5 py-1 rounded border transition-all hover:border-[oklch(0.577_0.245_27.325)] hover:text-[oklch(0.577_0.245_27.325)]"
							style={{
								borderColor: "oklch(0.88 0.008 80)",
								color: "oklch(0.50 0.010 60)"
							}}
						>
							Delete
						</button>
					)}
				</div>
			</td>
		</tr>
	);
}
