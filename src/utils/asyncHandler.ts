import type { NextFunction, Request, Response } from "express";

type AsyncRequestHandler<Req extends Request = Request> = (
  req: Req,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export const asyncHandler =
  <Req extends Request = Request>(handler: AsyncRequestHandler<Req>) =>
  (req: Req, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
