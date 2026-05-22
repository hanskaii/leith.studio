import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const studioGenerations = sqliteTable(
	"studio_generations",
	{
		id: text("id").primaryKey(),
		topic: text("topic").notNull(),
		imageUrl: text("image_url"),
		videoUrl: text("video_url"),
		imagePrompt: text("image_prompt"),
		videoPrompt: text("video_prompt"),
		status: text("status", {
			enum: ["pending_review", "processing", "approved", "rejected"]
		})
			.notNull()
			.default("pending_review"),
		postId: text("post_id"),
		scheduledAt: integer("scheduled_at", { mode: "timestamp" }),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull()
	},
	(table) => [
		index("idx_studio_generations_status").on(table.status),
		index("idx_studio_generations_created").on(table.createdAt)
	]
);
