import type { Response } from "express";

export interface PaginationMeta {
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ApiSuccessResponse<T = undefined> {
  success: true;
  message: string;
  data?: T;
  pagination?: PaginationMeta;
}

interface SendSuccessOptions<T> {
  statusCode?: number;
  message: string;
  data?: T;
  pagination?: PaginationMeta;
}

export const sendSuccess = <T = undefined>(res: Response, options: SendSuccessOptions<T>): void => {
  const { statusCode = 200, message, data, pagination } = options;

  const body: ApiSuccessResponse<T> = { success: true, message };
  if (data !== undefined) body.data = data;
  if (pagination !== undefined) body.pagination = pagination;

  res.status(statusCode).json(body);
};
