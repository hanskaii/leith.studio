import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const posts = sqliteTable(
	"posts",
	{
		id: text("id").primaryKey(),
		slug: text("slug").notNull().unique(),
		title: text("title").notNull(),
		body: text("body").notNull(),
		coverImage: text("cover_image"),
		tags: text("tags", { mode: "json" })
			.$type<string[]>()
			.notNull()
			.default([]),
		status: text("status", { enum: ["draft", "published"] })
			.notNull()
			.default("draft"),
		publishedAt: integer("published_at", { mode: "timestamp" }),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index("idx_posts_slug").on(table.slug),
		index("idx_posts_status").on(table.status),
		index("idx_posts_published_at").on(table.publishedAt)
	]
);
