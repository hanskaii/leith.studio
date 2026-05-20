import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const DEFAULT_IMAGE_PROMPT_TEMPLATE = `You are an expert AI image prompt engineer.

Topic: {topic}

Create a highly detailed, cinematic image prompt optimized for AI image generation. The image must be perfect as a looping background video base.

Requirements:
- Highly detailed environment, perfect composition for looping
- Atmospheric lighting, depth, subtle movement potential (particles, fog, soft light) but not too much
- Aspect ratio 16:9, maximum visual quality, masterpiece, best quality

Output only the final prompt, nothing else.`;

export const DEFAULT_VIDEO_PROMPT_TEMPLATE = `You are an expert AI video prompt engineer for looping background videos.

Base image description: {image_prompt}

Create a perfect looping video prompt.

Requirements for perfect loop:
- Seamless looping (motion must return to start position naturally)
- Subtle calm movement, ideal for streamer background
- Still camera, 8 second loop
- Motion elements: gentle rain, floating particles, moving clouds, flickering lights, soft wind (not too much)
- High cinematic quality, smooth motion, no sudden jumps

Output only the final video prompt.`;

export const generationSettings = sqliteTable("generation_settings", {
	id: integer("id").primaryKey().default(1),
	defaultImageModel: text("default_image_model")
		.notNull()
		.default("nano-banana-2"),
	defaultVideoModel: text("default_video_model")
		.notNull()
		.default("kling-v3"),
	defaultCount: integer("default_count").notNull().default(3),
	globalReferenceImageUrl: text("global_reference_image_url"),
	imagePromptTemplate: text("image_prompt_template")
		.notNull()
		.default(DEFAULT_IMAGE_PROMPT_TEMPLATE),
	videoPromptTemplate: text("video_prompt_template")
		.notNull()
		.default(DEFAULT_VIDEO_PROMPT_TEMPLATE),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});
