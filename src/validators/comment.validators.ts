import { z } from "zod";
import sanitizeHtml from "sanitize-html";
import { objectIdSchema } from "./common.js";

const stripMarkup = (value: string) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });

const contentSchema = z
  .string()
  .trim()
  .min(1, "Content is required")
  .max(2000, "Comment cannot exceed 2000 characters")
  .transform(stripMarkup)
  .pipe(z.string().min(1, "Content is required"));

export const createCommentSchema = z.object({
  body: z.object({
    content: contentSchema,
    postId: objectIdSchema.optional(),
    parentId: objectIdSchema.optional(),
  }),
});

export const updateCommentSchema = z.object({
  body: z.object({
    content: contentSchema,
    removeImage: z.coerce.boolean().optional(),
  }),
  params: z.object({ id: objectIdSchema }),
});

export const addReplySchema = z.object({
  body: z.object({
    content: contentSchema,
  }),
  params: z.object({ id: objectIdSchema }),
});

export const listCommentsQuerySchema = z.object({
  query: z.object({
    postId: objectIdSchema,
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    sortBy: z.enum(["newest", "mostLiked"]).default("newest"),
  }),
});

export const listRepliesQuerySchema = z.object({
  params: z.object({ id: objectIdSchema }),
  query: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>["body"];
export type ListCommentsQuery = z.infer<typeof listCommentsQuerySchema>["query"];
export type ListRepliesQuery = z.infer<typeof listRepliesQuerySchema>["query"];
