import { z } from "zod";
import mongoose from "mongoose";

export const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), { message: "Invalid id" });

export const idParamSchema = z.object({
  id: objectIdSchema,
});
