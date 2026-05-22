/**
 * Search document — Markdown + YAML front matter representation of a post
 * that gets written to R2 and consumed by Cloudflare AI Search via auto-crawl.
 *
 * The front matter holds identifiers and filters (postId, slug, type, access,
 * tags, publishedAt). The body holds rankable text (title, description, tag
 * names). Tag names appear in BOTH the front matter (machine-queryable) and
 * the body (text-rankable) on purpose — so semantic queries like "loop" find
 * loop-tagged content even when the title doesn't say "loop".
 */

export type IndexablePost = {
	id: string;
	slug: string;
	title: string;
	body: string;
	tags: { slug: string; name: string }[];
	format: string;
	access: "free" | "premium";
	publishedAt: Date | null;
};

function inferType(format: string): "video" | "audio" | "image" {
	if (["mp4", "webm"].includes(format)) return "video";
	if (["mp3", "wav", "ogg", "aac"].includes(format)) return "audio";
	return "image";
}

export function searchDocumentKey(postId: string): string {
	return `search/posts/${postId}.md`;
}

export function buildSearchDocument(post: IndexablePost): string {
	const tagNames = post.tags.map((t) => t.name).join(", ");
	const tagSlugs = post.tags
		.map((t) => t.slug)
		.filter(Boolean)
		.join(", ");
	const type = inferType(post.format);
	const publishedAt = post.publishedAt
		? post.publishedAt.toISOString()
		: "null";

	return `---
postId: ${post.id}
slug: ${post.slug}
type: ${type}
access: ${post.access}
tags: [${tagSlugs}]
publishedAt: ${publishedAt}
---

# ${post.title}

${post.body}

Tags: ${tagNames}
`;
}
