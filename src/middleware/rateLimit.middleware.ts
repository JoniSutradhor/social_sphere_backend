import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const tooManyRequests = (code: string, message: string) => ({
  success: false,
  error: { code, message },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyRequests("TOO_MANY_REQUESTS", "Too many attempts, please try again later"),
});

const createMutationRateLimiter = () =>
  rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? "unknown"),
    message: tooManyRequests("TOO_MANY_REQUESTS", "Too many requests, please slow down"),
  });

export const commentMutationRateLimiter = createMutationRateLimiter();
export const postMutationRateLimiter = createMutationRateLimiter();
