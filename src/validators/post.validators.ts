import { z } from "zod";
import sanitizeHtml from "sanitize-html";
import { objectIdSchema } from "./common.js";

const stripMarkup = (value: string) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });

const contentSchema = z
  .string()
  .trim()
  .min(1, "Content is required")
  .max(5000, "Post cannot exceed 5000 characters")
  .transform(stripMarkup)
  .pipe(z.string().min(1, "Content is required"));

const visibilitySchema = z.enum(["public", "private"]);

export const createPostSchema = z.object({
  body: z.object({
    content: contentSchema,
    visibility: visibilitySchema.default("public"),
  }),
});

export const updatePostSchema = z.object({
  body: z.object({
    content: contentSchema,
    removeImage: z.coerce.boolean().optional(),
    visibility: visibilitySchema.optional(),
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
