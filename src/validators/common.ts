import { z } from "zod";
import mongoose from "mongoose";

export const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), { message: "Invalid id" });

export const idParamOnlySchema = z.object({
  params: z.object({ id: objectIdSchema }),
});
