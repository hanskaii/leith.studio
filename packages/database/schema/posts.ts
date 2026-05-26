import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { users } from "./auth";
import { postAssets } from "./post-assets";
import { postMetadata } from "./post-metadata";
import { postStats } from "./post-stats";
import { postTags } from "./tags";

export const posts = sqliteTable(
	"posts",
	{
		id: text("id").primaryKey(),
		authorId: text("author_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		slug: text("slug").notNull().unique(),
		title: text("title").notNull(),
		body: text("body").notNull(),
		status: text("status", { enum: ["draft", "published"] })
			.notNull()
			.default("draft"),
		mediaStatus: text("media_status", {
			enum: ["pending", "ready", "failed"]
		})
			.notNull()
			.default("ready"),
		access: text("access", { enum: ["free", "premium"] })
			.notNull()
			.default("premium"),
		enrichmentStatus: text("enrichment_status", {
			enum: ["pending", "processing", "done", "failed"]
		}),
		publishedAt: integer("published_at", { mode: "timestamp" }),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index("idx_posts_slug").on(table.slug),
		index("idx_posts_status").on(table.status),
		index("idx_posts_media_status").on(table.mediaStatus),
		index("idx_posts_published_at").on(table.publishedAt),
		index("idx_posts_author_id").on(table.authorId)
	]
);

export const postsRelations = relations(posts, ({ one, many }) => ({
	author: one(users, {
		fields: [posts.authorId],
		references: [users.id]
	}),
	metadata: one(postMetadata, {
		fields: [posts.id],
		references: [postMetadata.postId]
	}),
	assets: many(postAssets),
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
