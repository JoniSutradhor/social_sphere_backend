import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/user.model.js";
import { UnauthorizedError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

interface AccessTokenPayload {
  id: string;
}

export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    throw new UnauthorizedError("Not authorized, no token");
  }

  const token = header.slice("Bearer ".length);

  let payload: AccessTokenPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
  } catch {
    throw new UnauthorizedError("Not authorized, token failed");
  }

  const user = await User.findById(payload.id).select("-password");
  if (!user) {
    throw new UnauthorizedError("User not found");
  }

  req.user = user;
  next();
});

export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next();
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
    const user = await User.findById(payload.id).select("-password");
    if (user) {
      req.user = user;
    }
  } catch {
    // ignore invalid token
  }

  next();
});
