ALTER TABLE `post_metadata` ADD `clip_key` text;--> statement-breakpoint
ALTER TABLE `post_metadata` ADD `processing_status` text DEFAULT 'pending' NOT NULL;