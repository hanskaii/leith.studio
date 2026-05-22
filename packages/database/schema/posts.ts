import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { postMetadata } from "./post-metadata";
import { postStats } from "./post-stats";
import { postTags } from "./tags";

export const posts = sqliteTable(
	"posts",
	{
		id: text("id").primaryKey(),
		slug: text("slug").notNull().unique(),
		title: text("title").notNull(),
		body: text("body").notNull(),
		coverImage: text("cover_image"),
		coverThumb: text("cover_thumb"),
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

export const postsRelations = relations(posts, ({ one, many }) => ({
	metadata: one(postMetadata, {
		fields: [posts.id],
		references: [postMetadata.postId]
	}),
	stats: many(postStats),
	postTags: many(postTags)
}));

export const postMetadataRelations = relations(postMetadata, ({ one }) => ({
	post: one(posts, {
		fields: [postMetadata.postId],
		references: [posts.id]
	})
}));

export const postStatsRelations = relations(postStats, ({ one }) => ({
	post: one(posts, {
		fields: [postStats.postId],
		references: [posts.id]
	})
}));
