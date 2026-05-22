import { Hono } from "hono";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { postMetadata, postTags, posts, tags } from "@workspace/database";
import { ApiResponse } from "../helpers/response.helper";
import type { HonoEnv } from "../types/hono.types";

const tagsHandler = new Hono<HonoEnv>().get("/", async (c) => {
	const db = c.get("db");

	// Only tags with at least one ready + published post. Ordered by usage
	// (post count desc) then alphabetically.
	const rows = await db
		.select({
			slug: tags.slug,
			name: tags.name,
			postCount: count(postTags.postId)
		})
		.from(tags)
		.innerJoin(postTags, eq(postTags.tagId, tags.id))
		.innerJoin(posts, eq(posts.id, postTags.postId))
		.innerJoin(postMetadata, eq(postMetadata.postId, posts.id))
		.where(
			and(
				eq(posts.status, "published"),
				eq(postMetadata.processingStatus, "ready")
			)
		)
		.groupBy(tags.id)
		.orderBy(desc(count(postTags.postId)), asc(tags.name));

	return ApiResponse.ok(c, "Tags", rows);
});

export default tagsHandler;
