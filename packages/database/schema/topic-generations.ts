import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const topicGenerations = sqliteTable(
	"topic_generations",
	{
		id: text("id").primaryKey(),
		topicId: text("topic_id").notNull(),
		imagePrompt: text("image_prompt"),
		videoPrompt: text("video_prompt"),
		vioImageId: integer("vio_image_id"),
		vioVideoId: integer("vio_video_id"),
		imageUrl: text("image_url"),
		videoUrl: text("video_url"),
		status: text("status", {
			enum: [
				"pending",
				"image_ready",
				"video_ready",
				"ready",
				"approved",
				"rejected"
			]
		})
			.notNull()
			.default("pending"),
		postId: text("post_id"),
		scheduledAt: integer("scheduled_at", { mode: "timestamp" }),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull()
	},
	(table) => [
		index("idx_topic_generations_topic_id").on(table.topicId),
		index("idx_topic_generations_status").on(table.status)
	]
);
