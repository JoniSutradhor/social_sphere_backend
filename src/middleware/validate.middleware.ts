import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { BadRequestError } from "../utils/ApiError.js";

interface ParsedShape {
  body?: unknown;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

export const validate =
  (schema: ZodType<ParsedShape>) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join("; ");
      return next(new BadRequestError(message));
    }

    const parsed = result.data;
    if (parsed.body !== undefined) req.body = parsed.body;
    if (parsed.params !== undefined) req.params = parsed.params as Request["params"];
    // req.query has no setter in Express 5 — stash validated/coerced query separately.
    if (parsed.query !== undefined) req.validatedQuery = parsed.query;

    next();
  };
