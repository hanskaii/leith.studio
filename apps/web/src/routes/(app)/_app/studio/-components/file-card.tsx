import { memo } from "react";
import { Badge } from "@workspace/ui";
import type { CreatorPost } from "@/routes/-fn/creator";

type Badge = "uploading" | "failed" | "processing-ai" | "draft" | "published";

function deriveBadge(post: CreatorPost): Badge {
	if (post.mediaStatus === "failed") return "failed";
	if (post.mediaStatus === "pending") return "uploading";
	if (
		post.enrichmentStatus === "processing" ||
		post.enrichmentStatus === "pending"
	)
		return "processing-ai";
	if (post.status === "published") return "published";
	return "draft";
}

const BADGE_LABEL: Record<Badge, string> = {
	uploading: "Uploading",
	failed: "Failed",
	"processing-ai": "AI working",
	draft: "Draft",
	published: "Published"
};

const BADGE_CLASS: Record<Badge, string> = {
	uploading: "bg-muted text-muted-foreground",
	failed: "bg-destructive/10 text-destructive border-destructive/20",
	"processing-ai":
		"bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
	draft: "bg-muted text-muted-foreground",
	published:
		"bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
};

function parseMedia(raw: unknown): { cover?: string; thumb?: string } {
	if (typeof raw !== "string") return {};
	try {
		const parsed = JSON.parse(raw);
		return typeof parsed === "object" && parsed !== null ? parsed : {};
	} catch {
		return {};
	}
}

function toUrl(key: string | undefined): string | null {
	if (!key) return null;
	if (/^https?:\/\//.test(key)) return key;
	const origin = typeof window !== "undefined" ? window.location.origin : "";
	return `${origin}/api/files/${key}`;
}

export const FileCard = memo(function FileCard({
	post,
	selected,
	onToggleSelect,
	onOpenDrawer
}: {
	post: CreatorPost;
	selected: boolean;
	onToggleSelect: (id: string) => void;
	onOpenDrawer: (id: string) => void;
}) {
	const badge = deriveBadge(post);
	const media = parseMedia((post as any).media);
	const thumbSrc = toUrl(media.thumb ?? media.cover);
	const title = post.title?.trim() || "Untitled";

	return (
		<div className="group relative flex flex-col gap-2">
			<button
				type="button"
				onClick={() => onOpenDrawer(post.id)}
				className="relative aspect-[3/4] overflow-hidden rounded-md bg-muted text-left transition-transform hover:scale-[1.01]"
			>
				{thumbSrc ? (
					<img
						src={thumbSrc}
						alt={title}
						loading="lazy"
						className="absolute inset-0 h-full w-full object-cover"
					/>
				) : (
					<div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
						{badge === "uploading" ? "Uploading…" : "No preview"}
					</div>
				)}
				{badge === "processing-ai" && (
					<div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
						<span className="inline-flex items-center gap-2 text-xs font-medium text-foreground">
							<span className="size-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
							AI working
						</span>
					</div>
				)}
				<div className="absolute right-2 top-2">
					<Badge
						variant="outline"
						className={`text-[10px] font-medium ${BADGE_CLASS[badge]}`}
					>
						{BADGE_LABEL[badge]}
					</Badge>
				</div>
			</button>

			<label className="flex cursor-pointer items-start gap-2">
				<input
					type="checkbox"
					checked={selected}
					onChange={() => onToggleSelect(post.id)}
					aria-label={`Select ${title}`}
					className="mt-1 size-3.5 cursor-pointer rounded border-border accent-primary"
				/>
				<span className="line-clamp-2 text-sm font-medium leading-snug">
					{title}
				</span>
			</label>
		</div>
	);
});
