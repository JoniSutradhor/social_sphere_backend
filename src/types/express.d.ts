import type { UserDocument } from "../models/user.model.js";

declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
      /**
       * Express 5's `req.query` is a getter with no setter, so validated/coerced
       * query values (e.g. `limit` coerced to a number) are stashed here instead
       * of trying to reassign `req.query` directly.
       */
      validatedQuery?: Record<string, unknown>;
    }
  }
}

export {};
