import { Hono } from "hono";
import { ApiError } from "../helpers/errors.helper";
import type { HonoEnv } from "../types/hono.types";

const DEV_PLACEHOLDERS: Record<string, string> = {
	mp4: "https://www.w3schools.com/html/mov_bbb.mp4",
	webm: "https://www.w3schools.com/html/mov_bbb.mp4",
	jpg: "https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=800&q=75&auto=format&fit=crop",
	png: "https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=800&q=75&auto=format&fit=crop"
};

const CONTENT_TYPES: Record<string, string> = {
	mp4: "video/mp4",
	webm: "video/webm",
	jpg: "image/jpeg",
	png: "image/png"
};

const filesHandler = new Hono<HonoEnv>().get("/*", async (c) => {
	const key = c.req.param("*");
	if (!key) throw ApiError.badRequest("Missing file key");

	const object = await c.env.STORAGE.get(key);
	if (!object) {
		if (c.env.APP_ENV !== "production") {
			const ext = key.split(".").pop() ?? "";
			return Response.redirect(
				DEV_PLACEHOLDERS[ext] ?? DEV_PLACEHOLDERS.mp4,
				302
			);
		}
		throw ApiError.notFound("File not found");
	}

	const ext = key.split(".").pop() ?? "";
	return new Response(object.body, {
		headers: {
			"Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
			"Cache-Control": "public, max-age=31536000, immutable"
		}
	});
});

export default filesHandler;
