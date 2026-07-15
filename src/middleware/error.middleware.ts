import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import mongoose from "mongoose";
import { ApiError, BadRequestError, ConflictError, NotFoundError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  if (err instanceof multer.MulterError) {
    err = new BadRequestError(
      err.code === "LIMIT_FILE_SIZE" ? "Image must be under 5MB" : err.message
    );
  } else if (err instanceof Error && err.message.includes("Only JPEG, PNG, WEBP")) {
    err = new BadRequestError(err.message);
  } else if (err instanceof mongoose.Error.ValidationError) {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
    err = new BadRequestError(message);
  } else if (err instanceof mongoose.Error.CastError) {
    err = new BadRequestError(`Invalid ${err.path}: ${err.value}`);
  } else if (
    err instanceof Error &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  ) {
    const field = Object.keys((err as { keyValue?: Record<string, unknown> }).keyValue ?? {})[0];
    err = new ConflictError(field ? `${field} already in use` : "Duplicate value");
  }

  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.originalUrl }, err.message);
    }
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
    return;
  }

  logger.error({ err, path: req.originalUrl }, "Unhandled error");
  res.status(500).json({
    success: false,
    error: { code: "SERVER_ERROR", message: "Something went wrong" },
  });
};
