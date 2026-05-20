import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { createReadStream } from "node:fs";
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { transform } from "@workspace/media";
import type { ProcessItem } from "@workspace/media";

const MOUNT = "/mnt/r2";

interface ProcessRequest {
	items: ProcessItem[];
}

interface ProcessResultEntry {
	outputPath: string;
	sizeBytes: number;
}

const app = new Hono()
	.get("/health", async (c) => {
		try {
			await access(MOUNT);
			return c.json({ ok: true, mount: MOUNT });
		} catch {
			return c.json(
				{ ok: false, mount: MOUNT, error: "R2 mount not available" },
				503
			);
		}
	})
	.post("/process", async (c) => {
		const body = await c.req.json<ProcessRequest>();
		const results: ProcessResultEntry[] = [];

		for (const item of body.items) {
			const nodeStream = createReadStream(item.inputPath);
			const webStream = Readable.toWeb(
				nodeStream
			) as ReadableStream<Uint8Array>;

			const result = await transform(
				webStream,
				item.pipeline,
				item.outputFormat
			);

			await mkdir(path.dirname(item.outputPath), { recursive: true });
			await writeFile(item.outputPath, Buffer.from(result.buffer));

			results.push({
				outputPath: item.outputPath,
				sizeBytes: result.buffer.byteLength
			});
		}

		return c.json({ ok: true, results });
	});

serve({ fetch: app.fetch, port: 8080 }, (info) => {
	console.log(`Media container listening on port ${info.port}`);
});
