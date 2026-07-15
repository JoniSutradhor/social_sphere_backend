import { z } from "zod";
import sanitizeHtml from "sanitize-html";
import { objectIdSchema } from "./common.js";

// Nothing in this app renders rich text, so the simplest XSS-proof approach is
// to strip all markup server-side rather than trying to allow-list a "safe" subset.
const stripMarkup = (value: string) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });

const contentSchema = z
  .string()
  .trim()
  .min(1, "Content is required")
  .max(5000, "Post cannot exceed 5000 characters")
  .transform(stripMarkup)
  .pipe(z.string().min(1, "Content is required"));

export const createPostSchema = z.object({
  body: z.object({
    content: contentSchema,
  }),
});

export const updatePostSchema = z.object({
  body: z.object({
    content: contentSchema,
    // multipart fields arrive as strings, hence the coercion
    removeImage: z.coerce.boolean().optional(),
  }),
  params: z.object({ id: objectIdSchema }),
});

export const listPostsQuerySchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    sortBy: z.enum(["newest", "mostLiked"]).default("newest"),
  }),
});

export type CreatePostInput = z.infer<typeof createPostSchema>["body"];
export type UpdatePostInput = z.infer<typeof updatePostSchema>["body"];
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>["query"];
