import {
	index,
	integer,
	primaryKey,
	sqliteTable,
	text
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { posts } from "./posts";

export const tags = sqliteTable(
	"tags",
	{
		id: text("id").primaryKey(),
		slug: text("slug").notNull().unique(),
		name: text("name").notNull(),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull()
	},
	(table) => [index("idx_tags_slug").on(table.slug)]
);

export const postTags = sqliteTable(
	"post_tags",
	{
		postId: text("post_id")
			.notNull()
			.references(() => posts.id, { onDelete: "cascade" }),
		tagId: text("tag_id")
			.notNull()
			.references(() => tags.id, { onDelete: "cascade" })
	},
	(table) => [
		primaryKey({ columns: [table.postId, table.tagId] }),
		index("idx_post_tags_tag_id").on(table.tagId),
		index("idx_post_tags_post_id").on(table.postId)
	]
);

export const tagsRelations = relations(tags, ({ many }) => ({
	postTags: many(postTags)
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
	post: one(posts, {
		fields: [postTags.postId],
		references: [posts.id]
	}),
	tag: one(tags, {
		fields: [postTags.tagId],
		references: [tags.id]
	})
}));
