CREATE TABLE `post_metadata` (
	`post_id` text PRIMARY KEY NOT NULL,
	`format` text NOT NULL,
	`resolution` text NOT NULL,
	`duration` integer,
	`is_loop` integer DEFAULT 0 NOT NULL,
	`file_key` text NOT NULL,
	`file_size` integer NOT NULL,
	`access` text DEFAULT 'premium' NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `post_stats` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`user_id` text NOT NULL,
	`downloaded_at` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_post_stats_post_id` ON `post_stats` (`post_id`);