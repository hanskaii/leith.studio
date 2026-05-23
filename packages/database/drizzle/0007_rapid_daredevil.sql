CREATE TABLE `studio_generations` (
	`id` text PRIMARY KEY NOT NULL,
	`topic` text NOT NULL,
	`image_url` text,
	`video_url` text,
	`image_prompt` text,
	`video_prompt` text,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`post_id` text,
	`scheduled_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_studio_generations_status` ON `studio_generations` (`status`);--> statement-breakpoint
CREATE INDEX `idx_studio_generations_created` ON `studio_generations` (`created_at`);--> statement-breakpoint
CREATE TABLE `post_tags` (
	`post_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`post_id`, `tag_id`),
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_post_tags_tag_id` ON `post_tags` (`tag_id`);--> statement-breakpoint
CREATE INDEX `idx_post_tags_post_id` ON `post_tags` (`post_id`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_slug_unique` ON `tags` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_tags_slug` ON `tags` (`slug`);--> statement-breakpoint
DROP TABLE `generation_settings`;--> statement-breakpoint
DROP TABLE `generation_topics`;--> statement-breakpoint
DROP TABLE `topic_generations`;--> statement-breakpoint
ALTER TABLE `posts` DROP COLUMN `tags`;