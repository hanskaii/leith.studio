CREATE TABLE `generation_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`default_image_model` text DEFAULT 'nano-banana-2' NOT NULL,
	`default_video_model` text DEFAULT 'kling-v3' NOT NULL,
	`default_count` integer DEFAULT 3 NOT NULL,
	`global_reference_image_url` text,
	`image_prompt_template` text DEFAULT 'You are an expert AI image prompt engineer.

Topic: {topic}

Create a highly detailed, cinematic image prompt optimized for AI image generation. The image must be perfect as a looping background video base.

Requirements:
- Highly detailed environment, perfect composition for looping
- Atmospheric lighting, depth, subtle movement potential (particles, fog, soft light) but not too much
- Aspect ratio 16:9, maximum visual quality, masterpiece, best quality

Output only the final prompt, nothing else.' NOT NULL,
	`video_prompt_template` text DEFAULT 'You are an expert AI video prompt engineer for looping background videos.

Base image description: {image_prompt}

Create a perfect looping video prompt.

Requirements for perfect loop:
- Seamless looping (motion must return to start position naturally)
- Subtle calm movement, ideal for streamer background
- Still camera, 8 second loop
- Motion elements: gentle rain, floating particles, moving clouds, flickering lights, soft wind (not too much)
- High cinematic quality, smooth motion, no sudden jumps

Output only the final video prompt.' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `generation_topics` (
	`id` text PRIMARY KEY NOT NULL,
	`topic` text NOT NULL,
	`status` text DEFAULT 'idle' NOT NULL,
	`reference_image_url` text,
	`count_override` integer,
	`model_overrides` text,
	`prompt_template_overrides` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_generation_topics_status` ON `generation_topics` (`status`);--> statement-breakpoint
CREATE TABLE `topic_generations` (
	`id` text PRIMARY KEY NOT NULL,
	`topic_id` text NOT NULL,
	`image_prompt` text,
	`video_prompt` text,
	`vio_image_id` integer,
	`vio_video_id` integer,
	`image_url` text,
	`video_url` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`post_id` text,
	`scheduled_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_topic_generations_topic_id` ON `topic_generations` (`topic_id`);--> statement-breakpoint
CREATE INDEX `idx_topic_generations_status` ON `topic_generations` (`status`);