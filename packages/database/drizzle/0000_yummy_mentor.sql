CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`config_id` text DEFAULT 'default' NOT NULL,
	`name` text,
	`start` text,
	`prefix` text,
	`key` text NOT NULL,
	`reference_id` text NOT NULL,
	`refill_interval` integer,
	`refill_amount` integer,
	`last_refill_at` integer,
	`enabled` integer,
	`rate_limit_enabled` integer,
	`rate_limit_time_window` integer,
	`rate_limit_max` integer,
	`request_count` integer,
	`remaining` integer,
	`last_request` integer,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`permissions` text,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_account_user_id` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_account_provider_account` ON `accounts` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`impersonated_by` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `idx_session_user_id` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`username` text,
	`email` text NOT NULL,
	`email_verified` integer NOT NULL,
	`image` text,
	`role` text DEFAULT 'user' NOT NULL,
	`banned` integer DEFAULT false NOT NULL,
	`ban_reason` text,
	`ban_expires` integer,
	`dodo_customer_id` text,
	`subscription_status` text,
	`subscription_id` text,
	`subscription_plan_id` text,
	`credits` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_verification_identifier` ON `verifications` (`identifier`);--> statement-breakpoint
CREATE INDEX `idx_verification_expires_at` ON `verifications` (`expires_at`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`media_status` text DEFAULT 'ready' NOT NULL,
	`access` text DEFAULT 'premium' NOT NULL,
	`enrichment_status` text,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_slug_unique` ON `posts` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_posts_slug` ON `posts` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_posts_status` ON `posts` (`status`);--> statement-breakpoint
CREATE INDEX `idx_posts_media_status` ON `posts` (`media_status`);--> statement-breakpoint
CREATE INDEX `idx_posts_published_at` ON `posts` (`published_at`);--> statement-breakpoint
CREATE INDEX `idx_posts_author_id` ON `posts` (`author_id`);--> statement-breakpoint
CREATE TABLE `post_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`role` text NOT NULL,
	`key` text NOT NULL,
	`format` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_post_assets_post_role` ON `post_assets` (`post_id`,`role`);--> statement-breakpoint
CREATE TABLE `post_metadata` (
	`post_id` text PRIMARY KEY NOT NULL,
	`format` text NOT NULL,
	`resolution` text NOT NULL,
	`duration` integer,
	`is_loop` integer DEFAULT false NOT NULL,
	`file_size` integer NOT NULL,
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
CREATE INDEX `idx_post_stats_post_id` ON `post_stats` (`post_id`);--> statement-breakpoint
CREATE INDEX `idx_post_stats_user_id` ON `post_stats` (`user_id`);--> statement-breakpoint
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
CREATE INDEX `idx_tags_slug` ON `tags` (`slug`);