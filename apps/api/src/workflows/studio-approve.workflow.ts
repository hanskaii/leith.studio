import {
	WorkflowEntrypoint,
	type WorkflowStep,
	type WorkflowEvent
} from "cloudflare:workers";
import {
	database,
	studioGenerations,
	posts,
	postMetadata,
	postTags,
	tags,
	eq,
	and
} from "@workspace/database";
import { slugifyTag } from "@workspace/database/utils/slug";
import { uniqueSlug } from "../lib/slug";
import { SearchService } from "../services/search.service";

type ApproveParams = {
	generationId: string;
	userId: string;
	scheduledAt?: string;
};

type Enrichment = {
	title: string;
	description: string;
	tags: string[];
};

export class StudioApproveWorkflow extends WorkflowEntrypoint<
	CloudflareBindings,
	ApproveParams
> {
	async run(event: WorkflowEvent<ApproveParams>, step: WorkflowStep) {
		const { generationId, userId, scheduledAt } = event.payload;
		let currentStepName = "lock";

		try {
			// 12.2 lock — atomic status flip pending_review → processing.
			// Returns null if another approval already grabbed this row.
			const row = await step.do("lock", async () => {
				const db = database(this.env.DATABASE);
				const result = await db
					.update(studioGenerations)
					.set({ status: "processing" })
					.where(
						and(
							eq(studioGenerations.id, generationId),
							eq(studioGenerations.status, "pending_review")
						)
					)
					.returning();

				if (result.length === 0) return null;
				return result[0];
			});

			if (!row) return { skipped: true };

			// 12.3 upload-video — fetch Vio temp URL into R2.
			currentStepName = "upload-video";
			const videoFileKey = await step.do(
				"upload-video",
				async (): Promise<string | null> => {
					if (!row.videoUrl) return null;
					const res = await fetch(row.videoUrl);
					if (!res.ok || !res.body) {
						throw new Error(`Failed to fetch video: ${res.status}`);
					}
					const key = `posts/video/${generationId}.mp4`;
					await this.env.STORAGE.put(key, res.body, {
						httpMetadata: { contentType: "video/mp4" }
					});
					return key;
				}
			);

			// 12.4 upload-thumbnail — imageUrl from generation is the natural
			// first-frame thumbnail. Stored as coverThumb on the post.
			currentStepName = "upload-thumbnail";
			const thumbnailKey = await step.do(
				"upload-thumbnail",
				async (): Promise<string | null> => {
					if (!row.imageUrl) return null;
					const res = await fetch(row.imageUrl);
					if (!res.ok || !res.body) {
						throw new Error(
							`Failed to fetch thumbnail: ${res.status}`
						);
					}
					const key = `posts/thumbnail/${generationId}.jpg`;
					await this.env.STORAGE.put(key, res.body, {
						httpMetadata: { contentType: "image/jpeg" }
					});
					return key;
				}
			);

			// 12.4b ai-enrich — vision model proposes title, description, and
			// tags from the thumbnail. Falls back to topic-based values when
			// no thumbnail is available or when the model returns un-parseable
			// output, so a flaky AI never blocks an approve.
			currentStepName = "ai-enrich";
			const enriched: Enrichment = await step.do(
				"ai-enrich",
				async (): Promise<Enrichment> => {
					const fallback: Enrichment = {
						title: row.topic,
						description:
							row.videoPrompt || row.imagePrompt || row.topic,
						tags: []
					};

					if (!thumbnailKey) return fallback;

					const obj = await this.env.STORAGE.get(thumbnailKey);
					if (!obj) return fallback;

					const buf = await obj.arrayBuffer();
					const bytes = new Uint8Array(buf);
					// btoa wants a binary string; chunk to avoid stack overflow
					// on multi-MB thumbnails.
					let binary = "";
					const chunkSize = 0x8000;
					for (let i = 0; i < bytes.length; i += chunkSize) {
						binary += String.fromCharCode(
							...bytes.subarray(i, i + chunkSize)
						);
					}
					const base64 = btoa(binary);

					const result = (await (this.env.AI as any).run(
						"@cf/meta/llama-3.2-11b-vision-instruct",
						{
							messages: [
								{
									role: "system",
									content:
										'You describe stock asset thumbnails. Return ONLY a JSON object with keys "title" (catchy, max 6 words), "description" (1-2 sentences for an asset library), and "tags" (3-6 short keyword strings in Title Case, describing mood, subject, and style). No prose, no code fences — JSON only.'
								},
								{
									role: "user",
									content: [
										{
											type: "text",
											text: `Topic: ${row.topic}`
										},
										{
											type: "image_url",
											image_url: {
												url: `data:image/jpeg;base64,${base64}`
											}
										}
									]
								}
							]
						}
					)) as { response?: string };

					const text = result?.response ?? "";
					const match = text.match(/\{[\s\S]*\}/);
					if (!match) return fallback;

					try {
						const parsed = JSON.parse(match[0]) as {
							title?: string;
							description?: string;
							tags?: unknown;
						};
						const tagList = Array.isArray(parsed.tags)
							? parsed.tags
									.filter(
										(t): t is string =>
											typeof t === "string" &&
											t.trim().length > 0
									)
									.slice(0, 6)
							: [];
						return {
							title: parsed.title?.trim() || fallback.title,
							description:
								parsed.description?.trim() ||
								fallback.description,
							tags: tagList
						};
					} catch {
						return fallback;
					}
				}
			);

			// 12.5 create-post — atomic insert posts + postMetadata + flip
			// studioGenerations to approved.
			currentStepName = "create-post";
			const created = await step.do("create-post", async () => {
				const db = database(this.env.DATABASE);
				const newPostId = crypto.randomUUID();
				const title = enriched.title;
				const body = enriched.description;
				const slug = await uniqueSlug(title, db);
				const now = new Date();
				const publishedAt = scheduledAt ? new Date(scheduledAt) : null;

				// For image-only generations, the image itself IS the file.
				// Use thumbnailKey as fileKey if no videoFileKey.
				const fileKey = videoFileKey ?? thumbnailKey;
				if (!fileKey) {
					throw new Error(
						"Generation has neither video nor image asset"
					);
				}
				const format = videoFileKey ? "mp4" : "jpg";

				await db.transaction(async (tx: any) => {
					await tx.insert(posts).values({
						id: newPostId,
						slug,
						title,
						body,
						coverImage: row.imageUrl,
						coverThumb: thumbnailKey,
						status: "draft",
						publishedAt,
						createdAt: now,
						updatedAt: now
					});
					await tx.insert(postMetadata).values({
						postId: newPostId,
						format,
						resolution: "1920x1080",
						isLoop: videoFileKey ? 1 : 0,
						fileKey,
						fileSize: 0,
						access: "premium",
						processingStatus: videoFileKey ? "pending" : "ready"
					});
					await tx
						.update(studioGenerations)
						.set({ status: "approved", postId: newPostId })
						.where(eq(studioGenerations.id, generationId));
				});
				return { postId: newPostId, slug };
			});

			const { postId } = created;

			// 12.5b upsert-tags — idempotent insert into `tags` (ON CONFLICT
			// (slug) DO NOTHING) then link via `post_tags`. Safe to retry — the
			// composite PK on (postId, tagId) plus the slug UNIQUE constraint
			// keep duplicates out.
			currentStepName = "upsert-tags";
			await step.do("upsert-tags", async () => {
				if (enriched.tags.length === 0) {
					return { inserted: 0 };
				}
				const db = database(this.env.DATABASE);
				const now = new Date();

				await db.transaction(async (tx: any) => {
					for (const name of enriched.tags) {
						const slug = slugifyTag(name);
						if (!slug) continue;

						const tagId = crypto.randomUUID();
						await tx
							.insert(tags)
							.values({
								id: tagId,
								slug,
								name,
								createdAt: now
							})
							.onConflictDoNothing({ target: tags.slug });

						// Look up the canonical id — either the one we just
						// inserted, or the pre-existing one if the conflict
						// path was taken.
						const [existing] = await tx
							.select({ id: tags.id })
							.from(tags)
							.where(eq(tags.slug, slug))
							.limit(1);

						if (!existing) continue;

						await tx
							.insert(postTags)
							.values({
								postId,
								tagId: existing.id
							})
							.onConflictDoNothing();
					}
				});

				return { inserted: enriched.tags.length };
			});

			// 12.5c index-search — write the post's search document to R2 so
			// Cloudflare AI Search picks it up on its next auto-crawl. R2 PUT
			// is idempotent so workflow retries are safe. Failures bubble up
			// to the outer catch and revert the generation row via the agent
			// notify path — better fail loud than ship an un-indexed post.
			currentStepName = "index-search";
			await step.do("index-search", async () => {
				await new SearchService(this.env).index({
					id: postId,
					slug: created.slug,
					title: enriched.title,
					body: enriched.description,
					tags: enriched.tags
						.map((name) => ({ slug: slugifyTag(name), name }))
						.filter((t) => t.slug.length > 0),
					format: videoFileKey ? "mp4" : "jpg",
					access: "premium",
					publishedAt: scheduledAt ? new Date(scheduledAt) : null
				});
			});

			// 12.6 trigger-video-processing — only for video posts; image-only
			// posts are immediately ready.
			currentStepName = "trigger-video-processing";
			await step.do("trigger-video-processing", async () => {
				if (!videoFileKey) return;
				await this.env.VIDEO_PROCESSING_WORKFLOW.create({
					id: `process-${postId}`,
					params: {
						postId,
						slug: created.slug,
						fileKey: videoFileKey,
						format: "mp4"
					}
				});
			});

			// 12.7 notify-agent — DO RPC tells the StudioAgent the approve
			// is done; agent appends a chat message + broadcasts approve_done.
			currentStepName = "notify-agent";
			await step.do("notify-agent", async () => {
				const stub = this.env.STUDIO_AGENT.get(
					this.env.STUDIO_AGENT.idFromName(userId)
				);
				const type: "video" | "image" = videoFileKey
					? "video"
					: "image";
				// @ts-ignore -- RPC method on the agent DO
				await stub.onApproveDone({ generationId, postId, type });
			});

			return { postId, type: videoFileKey ? "video" : "image" };
		} catch (err: any) {
			// 12.8 on error: notify the agent so it can revert status + post
			// a retry message in chat, then re-throw so Workflows marks the
			// run as errored.
			try {
				const stub = this.env.STUDIO_AGENT.get(
					this.env.STUDIO_AGENT.idFromName(userId)
				);
				// @ts-ignore -- RPC method on the agent DO
				await stub.onApproveFailed({
					generationId,
					step: currentStepName,
					error: err.message ?? String(err)
				});
			} catch {
				// If even the notify fails, swallow — we still want the
				// workflow to error so it's visible in the dashboard.
			}
			throw err;
		}
	}
}
