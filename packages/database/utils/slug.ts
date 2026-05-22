/**
 * Slugify a tag display name into a URL-safe slug.
 *
 * - Lowercase, ASCII-only
 * - Strips punctuation
 * - Collapses whitespace and underscores into single hyphens
 * - Trims leading/trailing hyphens
 *
 * No DB collision retry — uniqueness is enforced by the `tags.slug` UNIQUE
 * constraint. Callers should use `INSERT ... ON CONFLICT (slug) DO NOTHING`
 * to make tag creation idempotent.
 *
 * @example
 *   slugifyTag("Cinematic Loop") // → "cinematic-loop"
 *   slugifyTag("Noir / Rain")    // → "noir-rain"
 *   slugifyTag("  ")             // → ""  (caller should skip empty results)
 */
export function slugifyTag(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, "") // strip punctuation
		.replace(/[\s_]+/g, "-") // whitespace/underscores → hyphens
		.replace(/-+/g, "-") // collapse multiple hyphens
		.replace(/^-+|-+$/g, ""); // trim hyphens
}
