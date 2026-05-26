PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_post_metadata` (
	`post_id` text PRIMARY KEY NOT NULL,
	`format` text NOT NULL,
	`resolution` text NOT NULL,
	`duration` integer,
	`is_loop` integer DEFAULT false NOT NULL,
	`file_key` text NOT NULL,
	`preview_key` text,
	`clip_key` text,
	`file_size` integer NOT NULL,
	`access` text DEFAULT 'premium' NOT NULL,
	`processing_status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_post_metadata`("post_id", "format", "resolution", "duration", "is_loop", "file_key", "preview_key", "clip_key", "file_size", "access", "processing_status") SELECT "post_id", "format", "resolution", "duration", "is_loop", "file_key", "preview_key", "clip_key", "file_size", "access", "processing_status" FROM `post_metadata`;--> statement-breakpoint
DROP TABLE `post_metadata`;--> statement-breakpoint
ALTER TABLE `__new_post_metadata` RENAME TO `post_metadata`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `posts` ADD `author_id` text NOT NULL REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `idx_posts_author_id` ON `posts` (`author_id`);--> statement-breakpoint
CREATE INDEX `idx_post_stats_user_id` ON `post_stats` (`user_id`);