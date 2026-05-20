import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { topicGenerations } from "./topic-generations";

export const generationTopics = sqliteTable(
	"generation_topics",
	{
		id: text("id").primaryKey(),
		topic: text("topic").notNull(),
		status: text("status", {
			enum: [
				"idle",
				"generating",
				"ready_for_review",
				"approved",
				"rejected"
			]
		})
			.notNull()
			.default("idle"),
		referenceImageUrl: text("reference_image_url"),
		countOverride: integer("count_override"),
		modelOverrides: text("model_overrides", { mode: "json" }).$type<{
			image?: string;
			video?: string;
		} | null>(),
		promptTemplateOverrides: text("prompt_template_overrides", {
			mode: "json"
		}).$type<{
			image?: string;
			video?: string;
		} | null>(),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
	},
	(table) => [index("idx_generation_topics_status").on(table.status)]
);

export const generationTopicsRelations = relations(
	generationTopics,
	({ many }) => ({
		generations: many(topicGenerations)
	})
);

export const topicGenerationsRelations = relations(
	topicGenerations,
	({ one }) => ({
		topic: one(generationTopics, {
			fields: [topicGenerations.topicId],
			references: [generationTopics.id]
		})
	})
);
