import mongoose from "mongoose";
import { BadRequestError } from "./ApiError.js";

export interface DateIdCursor {
  createdAt: string;
  id: string;
}

export interface CountDateIdCursor extends DateIdCursor {
  count: number;
}

export const encodeCursor = (payload: unknown): string =>
  Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

export const decodeCursor = <T>(cursor: string): T => {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    throw new BadRequestError("Invalid pagination cursor");
  }
};

/** Keyset seek filter for a single `createdAt` + `_id` tiebreaker sort. */
export const dateIdSeekFilter = (
  cursor: DateIdCursor,
  direction: "asc" | "desc" = "desc"
): mongoose.FilterQuery<any> => {
  const op = direction === "desc" ? "$lt" : "$gt";
  const createdAt = new Date(cursor.createdAt);
  return {
    $or: [
      { createdAt: { [op]: createdAt } },
      { createdAt, _id: { [op]: new mongoose.Types.ObjectId(cursor.id) } },
    ],
  };
};

/** Keyset seek filter for a `countField` (desc) + `createdAt` (desc) + `_id` tiebreaker sort. */
export const countDateIdSeekFilter = (
  cursor: CountDateIdCursor,
  countField: string
): mongoose.FilterQuery<any> => {
  const createdAt = new Date(cursor.createdAt);
  return {
    $or: [
      { [countField]: { $lt: cursor.count } },
      { [countField]: cursor.count, createdAt: { $lt: createdAt } },
      {
        [countField]: cursor.count,
        createdAt,
        _id: { $lt: new mongoose.Types.ObjectId(cursor.id) },
      },
    ],
  };
};
