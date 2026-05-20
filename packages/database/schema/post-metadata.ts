import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { posts } from "./posts";

export const postMetadata = sqliteTable("post_metadata", {
	postId: text("post_id")
		.primaryKey()
		.references(() => posts.id, { onDelete: "cascade" }),
	format: text("format", { enum: ["mp4", "png", "jpg", "webm"] }).notNull(),
	resolution: text("resolution").notNull(),
	duration: integer("duration"),
	isLoop: integer("is_loop").notNull().default(0),
	fileKey: text("file_key").notNull(),
	previewKey: text("preview_key"),
	clipKey: text("clip_key"),
	fileSize: integer("file_size").notNull(),
	access: text("access", { enum: ["free", "premium"] })
		.notNull()
		.default("premium"),
	processingStatus: text("processing_status", {
		enum: ["pending", "processing", "ready", "failed"]
	})
		.notNull()
		.default("pending")
});
