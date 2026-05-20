import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, desc, and, inArray } from "@workspace/database";
import {
	generationTopics,
	topicGenerations,
	generationSettings,
	posts,
	postMetadata
} from "@workspace/database";
import { ApiError } from "../helpers/errors.helper";
import { ApiResponse } from "../helpers/response.helper";
import { authMiddleware } from "../middleware/auth.middleware";
import { protect } from "../middleware/protect.middleware";
import type { HonoEnv } from "../types/hono.types";
import {
	DEFAULT_IMAGE_PROMPT_TEMPLATE,
	DEFAULT_VIDEO_PROMPT_TEMPLATE
} from "@workspace/database";
import { uniqueSlug } from "../lib/slug";

const TopicCreateSchema = z.object({
	topic: z.string().min(1).max(200),
	referenceImageUrl: z.string().url().optional(),
	countOverride: z.number().int().min(1).max(10).optional(),
	modelOverrides: z
		.object({ image: z.string().optional(), video: z.string().optional() })
		.optional(),
	promptTemplateOverrides: z
		.object({ image: z.string().optional(), video: z.string().optional() })
		.optional()
});

const TopicUpdateSchema = TopicCreateSchema.partial();

const SettingsSchema = z.object({
	defaultImageModel: z.string().optional(),
	defaultVideoModel: z.string().optional(),
	defaultCount: z.number().int().min(1).max(10).optional(),
	globalReferenceImageUrl: z.string().url().nullable().optional(),
	imagePromptTemplate: z.string().min(10).optional(),
	videoPromptTemplate: z.string().min(10).optional()
});

const ApproveSchema = z.object({
	ids: z.array(z.string()).min(1),
	scheduledAt: z.string().datetime().optional()
});

const studioHandler = new Hono<HonoEnv>()
	.use("*", authMiddleware, protect("content.manage"))

	// ── Topics ────────────────────────────────────────────────────────────────

	.get("/topics", async (c) => {
		const db = c.get("db");
		const topics = await db.query.generationTopics.findMany({
			orderBy: desc(generationTopics.createdAt),
			with: { generations: true }
		});
		return ApiResponse.ok(c, "ok", topics);
	})

	.post("/topics", zValidator("json", TopicCreateSchema), async (c) => {
		const db = c.get("db");
		const data = c.req.valid("json");
		const id = crypto.randomUUID();
		const now = new Date();
		const [topic] = await db
			.insert(generationTopics)
			.values({
				id,
				topic: data.topic,
				referenceImageUrl: data.referenceImageUrl,
				countOverride: data.countOverride,
				modelOverrides: data.modelOverrides ?? null,
				promptTemplateOverrides: data.promptTemplateOverrides ?? null,
				createdAt: now,
				updatedAt: now
			})
			.returning();
		return ApiResponse.created(c, "Topic created", topic);
	})

	.patch("/topics/:id", zValidator("json", TopicUpdateSchema), async (c) => {
		const db = c.get("db");
		const id = c.req.param("id");
		const data = c.req.valid("json");
		const topic = await db.query.generationTopics.findFirst({
			where: eq(generationTopics.id, id)
		});
		if (!topic) throw ApiError.notFound("Topic not found");

		const [updated] = await db
			.update(generationTopics)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(generationTopics.id, id))
			.returning();
		return ApiResponse.ok(c, "Topic updated", updated);
	})

	.delete("/topics/:id", async (c) => {
		const db = c.get("db");
		const id = c.req.param("id");
		const topic = await db.query.generationTopics.findFirst({
			where: eq(generationTopics.id, id)
		});
		if (!topic) throw ApiError.notFound("Topic not found");

		await db.delete(generationTopics).where(eq(generationTopics.id, id));
		return ApiResponse.ok(c, "Topic deleted");
	})

	.post("/topics/:id/trigger", async (c) => {
		const db = c.get("db");
		const id = c.req.param("id");
		const topic = await db.query.generationTopics.findFirst({
			where: eq(generationTopics.id, id)
		});
		if (!topic) throw ApiError.notFound("Topic not found");
		if (topic.status === "generating") {
			throw ApiError.conflict("Topic is already generating");
		}

		const settings = await db.query.generationSettings.findFirst();

		await db
			.update(generationTopics)
			.set({ status: "generating", updatedAt: new Date() })
			.where(eq(generationTopics.id, id));

		await c.env.TOPIC_GENERATION_WORKFLOW.create({
			params: {
				topicId: id,
				topic: topic.topic,
				count: topic.countOverride ?? settings?.defaultCount ?? 3,
				imageModel:
					topic.modelOverrides?.image ??
					settings?.defaultImageModel ??
					"nano-banana-2",
				videoModel:
					topic.modelOverrides?.video ??
					settings?.defaultVideoModel ??
					"kling-v3",
				referenceImageUrl:
					topic.referenceImageUrl ??
					settings?.globalReferenceImageUrl ??
					undefined,
				imagePromptTemplate:
					topic.promptTemplateOverrides?.image ??
					settings?.imagePromptTemplate ??
					DEFAULT_IMAGE_PROMPT_TEMPLATE,
				videoPromptTemplate:
					topic.promptTemplateOverrides?.video ??
					settings?.videoPromptTemplate ??
					DEFAULT_VIDEO_PROMPT_TEMPLATE
			}
		});

		return ApiResponse.ok(c, "Generation triggered");
	})

	// ── Review ────────────────────────────────────────────────────────────────

	.get("/review", async (c) => {
		const db = c.get("db");
		const gens = await db.query.topicGenerations.findMany({
			where: inArray(topicGenerations.status, ["ready", "approved"]),
			orderBy: desc(topicGenerations.createdAt),
			with: { topic: true }
		});
		return ApiResponse.ok(c, "ok", gens);
	})

	.post("/review/approve", zValidator("json", ApproveSchema), async (c) => {
		const db = c.get("db");
		const { ids, scheduledAt } = c.req.valid("json");
		const scheduledDate = scheduledAt ? new Date(scheduledAt) : undefined;
		const results: { genId: string; postId: string; slug: string }[] = [];

		for (const genId of ids) {
			const gen = await db.query.topicGenerations.findFirst({
				where: eq(topicGenerations.id, genId),
				with: { topic: true }
			});
			if (!gen || !gen.videoUrl) continue;

			const topic = (gen as any).topic;

			// 1. Generate post metadata via AI vision
			let title = topic?.topic ?? "Generated Video";
			let body = gen.videoPrompt ?? gen.imagePrompt ?? "";
			let tags: string[] = [];

			if (gen.imageUrl) {
				try {
					const aiResult = (await (c.env.AI as any).run(
						"@cf/meta/llama-3.2-11b-vision-instruct",
						{
							messages: [
								{
									role: "user",
									content: [
										{
											type: "image_url",
											image_url: { url: gen.imageUrl }
										},
										{
											type: "text",
											text: `You are a content metadata writer for a platform that sells looping background videos for streamers and VTubers.

Topic context: "${topic?.topic ?? ""}"

Based on this background video image, generate metadata as valid JSON:
{
  "title": "Short catchy title (3-7 words, no quotes)",
  "body": "Atmospheric description of the scene (2-3 sentences, highlight mood and details)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

Output only the JSON object, nothing else.`
										}
									]
								}
							],
							max_tokens: 400
						}
					)) as any;

					const raw: string =
						aiResult?.response ?? aiResult?.generated_text ?? "";
					const jsonMatch = raw.match(/\{[\s\S]*\}/);
					if (jsonMatch) {
						const parsed = JSON.parse(jsonMatch[0]);
						if (parsed.title) title = parsed.title;
						if (parsed.body) body = parsed.body;
						if (Array.isArray(parsed.tags)) tags = parsed.tags;
					}
				} catch {
					// AI metadata generation failed — fall back to defaults
				}
			}

			// 2. Download video from Vio, upload to R2
			const videoResponse = await fetch(gen.videoUrl);
			if (!videoResponse.ok) continue;

			const videoKey = `generated/${gen.topicId}/${genId}.mp4`;
			await (c.env as any).STORAGE.put(videoKey, videoResponse.body!, {
				httpMetadata: { contentType: "video/mp4" }
			});

			// 3. Create draft post
			const postId = crypto.randomUUID();
			const slug = await uniqueSlug(title, db);
			const now = new Date();

			await db.insert(posts).values({
				id: postId,
				slug,
				title,
				body,
				tags,
				status: "draft",
				createdAt: now,
				updatedAt: now
			});

			await db.insert(postMetadata).values({
				postId,
				format: "mp4",
				resolution: "1920x1080",
				fileKey: videoKey,
				fileSize: 0,
				access: "premium",
				processingStatus: "pending"
			});

			// 4. Trigger video processing workflow
			await c.env.VIDEO_PROCESSING_WORKFLOW.create({
				params: {
					postId,
					slug,
					fileKey: videoKey,
					format: "mp4"
				}
			});

			// 5. Update generation + topic
			await db
				.update(topicGenerations)
				.set({ status: "approved", postId, scheduledAt: scheduledDate })
				.where(eq(topicGenerations.id, genId));

			await db
				.update(generationTopics)
				.set({ status: "approved", updatedAt: now })
				.where(eq(generationTopics.id, gen.topicId));

			results.push({ genId, postId, slug });
		}

		return ApiResponse.ok(
			c,
			`${results.length} draft post(s) created`,
			results
		);
	})

	.post(
		"/review/reject",
		zValidator("json", z.object({ ids: z.array(z.string()).min(1) })),
		async (c) => {
			const db = c.get("db");
			const { ids } = c.req.valid("json");

			for (const genId of ids) {
				const gen = await db.query.topicGenerations.findFirst({
					where: eq(topicGenerations.id, genId)
				});
				if (!gen) continue;

				await db
					.update(topicGenerations)
					.set({ status: "rejected" })
					.where(eq(topicGenerations.id, genId));

				// Reset topic to idle if no remaining ready generations
				const remaining = await db.query.topicGenerations.findMany({
					where: and(
						eq(topicGenerations.topicId, gen.topicId),
						inArray(topicGenerations.status, ["ready"])
					)
				});
				if (remaining.length === 0) {
					await db
						.update(generationTopics)
						.set({ status: "idle", updatedAt: new Date() })
						.where(eq(generationTopics.id, gen.topicId));
				}
			}

			return ApiResponse.ok(c, "Rejected");
		}
	)

	// ── Settings ──────────────────────────────────────────────────────────────

	.get("/settings", async (c) => {
		const db = c.get("db");
		const settings = await db.query.generationSettings.findFirst();
		return ApiResponse.ok(c, "ok", settings ?? null);
	})

	.put("/settings", zValidator("json", SettingsSchema), async (c) => {
		const db = c.get("db");
		const data = c.req.valid("json");

		const existing = await db.query.generationSettings.findFirst();

		if (existing) {
			const [updated] = await db
				.update(generationSettings)
				.set({ ...data, updatedAt: new Date() })
				.where(eq(generationSettings.id, 1))
				.returning();
			return ApiResponse.ok(c, "Settings updated", updated);
		}

		const [created] = await db
			.insert(generationSettings)
			.values({
				id: 1,
				defaultImageModel: data.defaultImageModel ?? "nano-banana-2",
				defaultVideoModel: data.defaultVideoModel ?? "kling-v3",
				defaultCount: data.defaultCount ?? 3,
				globalReferenceImageUrl: data.globalReferenceImageUrl ?? null,
				imagePromptTemplate:
					data.imagePromptTemplate ?? DEFAULT_IMAGE_PROMPT_TEMPLATE,
				videoPromptTemplate:
					data.videoPromptTemplate ?? DEFAULT_VIDEO_PROMPT_TEMPLATE,
				updatedAt: new Date()
			})
			.returning();
		return ApiResponse.ok(c, "Settings saved", created);
	});

export default studioHandler;
