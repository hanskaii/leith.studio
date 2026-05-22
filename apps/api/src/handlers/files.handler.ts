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

/**
 * Parse an HTTP `Range` request header into a half-open byte interval.
 * Returns `null` for absent, malformed, or multi-range headers — callers
 * should fall back to serving the full object in that case.
 *
 * Supported forms:
 *   bytes=0-499        → { offset: 0,   length: 500 }
 *   bytes=500-         → { offset: 500, length: size - 500 }
 *   bytes=-200         → suffix: last 200 bytes
 */
function parseRange(
	header: string | undefined,
	size: number
): { offset: number; length: number } | null {
	if (!header) return null;
	if (!header.startsWith("bytes=")) return null;
	const spec = header.slice("bytes=".length).trim();
	// Multi-range (`bytes=0-99,200-299`) — decline. Serving multipart/byteranges
	// is more work than the upside and browsers fall back gracefully to 200.
	if (spec.includes(",")) return null;

	const dash = spec.indexOf("-");
	if (dash === -1) return null;
	const startStr = spec.slice(0, dash).trim();
	const endStr = spec.slice(dash + 1).trim();

	if (startStr === "") {
		// Suffix range: `bytes=-N` → last N bytes.
		const suffix = Number(endStr);
		if (!Number.isFinite(suffix) || suffix <= 0) return null;
		const length = Math.min(suffix, size);
		return { offset: size - length, length };
	}

	const start = Number(startStr);
	if (!Number.isFinite(start) || start < 0 || start >= size) return null;

	if (endStr === "") {
		return { offset: start, length: size - start };
	}

	const end = Number(endStr);
	if (!Number.isFinite(end) || end < start) return null;
	const clampedEnd = Math.min(end, size - 1);
	return { offset: start, length: clampedEnd - start + 1 };
}

const filesHandler = new Hono<HonoEnv>().get("/*", async (c) => {
	const key = c.req.param("*");
	if (!key) throw ApiError.badRequest("Missing file key");

	const ext = key.split(".").pop() ?? "";
	const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

	// HEAD-style read first to learn the object size, then issue a ranged
	// GET if the client asked for one. R2's `.head()` returns metadata
	// without the body, so this is cheap.
	const head = await c.env.STORAGE.head(key);
	if (!head) {
		if (c.env.APP_ENV !== "production") {
			return Response.redirect(
				DEV_PLACEHOLDERS[ext] ?? DEV_PLACEHOLDERS.mp4,
				302
			);
		}
		throw ApiError.notFound("File not found");
	}

	const size = head.size;
	const rangeHeader = c.req.header("Range");
	const range = parseRange(rangeHeader, size);

	if (range) {
		const object = await c.env.STORAGE.get(key, {
			range: { offset: range.offset, length: range.length }
		});
		if (!object) throw ApiError.notFound("File not found");
		const end = range.offset + range.length - 1;
		return new Response(object.body, {
			status: 206,
			headers: {
				"Content-Type": contentType,
				"Content-Length": String(range.length),
				"Content-Range": `bytes ${range.offset}-${end}/${size}`,
				"Accept-Ranges": "bytes",
				"Cache-Control": "public, max-age=31536000, immutable"
			}
		});
	}

	// No (valid) Range header → serve the full object. `Accept-Ranges` is
	// still set so the browser knows it CAN seek next time.
	const object = await c.env.STORAGE.get(key);
	if (!object) throw ApiError.notFound("File not found");

	return new Response(object.body, {
		headers: {
			"Content-Type": contentType,
			"Content-Length": String(size),
			"Accept-Ranges": "bytes",
			"Cache-Control": "public, max-age=31536000, immutable"
		}
	});
});

export default filesHandler;
