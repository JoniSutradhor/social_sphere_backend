import { z } from "zod";
import mongoose from "mongoose";

export const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), { message: "Invalid id" });

export const idParamOnlySchema = z.object({
  params: z.object({ id: objectIdSchema }),
});

export const listReactorsQuerySchema = z.object({
  params: z.object({ id: objectIdSchema }),
  query: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

export type ListReactorsQuery = z.infer<typeof listReactorsQuerySchema>["query"];
