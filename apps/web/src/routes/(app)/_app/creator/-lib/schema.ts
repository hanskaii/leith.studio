import { z } from "zod";

export const PostSchema = z.object({
	title: z.string().min(1, "Title is required"),
	tags: z.string(),
	coverImage: z.string().nullable(),
	coverThumb: z.string().nullable(),
	fileKey: z.string().nullable(),
	fileName: z.string().nullable(),
	fileSize: z.number().nullable(),
	format: z.string(),
	resolution: z.string(),
	duration: z.union([z.string(), z.number()]),
	isLoop: z.boolean(),
	access: z.enum(["free", "premium"])
});

export type PostValues = z.infer<typeof PostSchema>;
