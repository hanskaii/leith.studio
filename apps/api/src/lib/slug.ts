import { eq, like } from "drizzle-orm";
import { posts } from "@workspace/database";
import type { DatabaseInstance } from "@workspace/database";

export function toSlug(title: string): string {
	return title
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "")
		.replace(/[\s_]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export async function uniqueSlug(
	title: string,
	db: DatabaseInstance,
	excludeId?: string
): Promise<string> {
	const base = toSlug(title);
	const existing = await db.query.posts.findMany({
		where: like(posts.slug, `${base}%`),
		columns: { slug: true }
	});

	const slugSet = new Set(
		existing.filter((p) => !excludeId || p.slug !== base).map((p) => p.slug)
	);

	if (!slugSet.has(base)) return base;

	let i = 2;
	while (slugSet.has(`${base}-${i}`)) i++;
	return `${base}-${i}`;
}
