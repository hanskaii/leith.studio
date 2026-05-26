import { relations } from "drizzle-orm";
import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { posts } from "./posts";

export const postAssets = sqliteTable(
	"post_assets",
	{
		id: text("id").primaryKey(),
		postId: text("post_id")
			.notNull()
			.references(() => posts.id, { onDelete: "cascade" }),
		role: text("role", { enum: ["cover", "thumb", "asset"] }).notNull(),
		key: text("key").notNull(),
		format: text("format").notNull()
	},
	(table) => [
		uniqueIndex("uq_post_assets_post_role").on(table.postId, table.role)
	]
);

export const postAssetsRelations = relations(postAssets, ({ one }) => ({
	post: one(posts, {
		fields: [postAssets.postId],
		references: [posts.id]
	})
}));
