import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { posts } from "./posts";
import { users } from "./auth";

export const postStats = sqliteTable(
	"post_stats",
	{
		id: text("id").primaryKey(),
		postId: text("post_id")
			.notNull()
			.references(() => posts.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		downloadedAt: integer("downloaded_at", { mode: "timestamp" }).notNull()
	},
	(table) => [
		index("idx_post_stats_post_id").on(table.postId),
		index("idx_post_stats_user_id").on(table.userId)
	]
);
