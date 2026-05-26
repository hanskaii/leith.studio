import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { posts } from "./posts";

export const postMetadata = sqliteTable("post_metadata", {
	postId: text("post_id")
		.primaryKey()
		.references(() => posts.id, { onDelete: "cascade" }),
	format: text("format", {
		enum: ["mp4", "png", "jpg", "webm", "mp3", "wav", "ogg", "aac"]
	}).notNull(),
	resolution: text("resolution").notNull(),
	duration: integer("duration"),
	isLoop: integer("is_loop", { mode: "boolean" }).notNull().default(false),
	fileSize: integer("file_size").notNull()
});
