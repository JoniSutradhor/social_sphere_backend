import { env } from "./env.js";

// CLIENT_URL may be a comma-separated list (e.g. local dev + deployed frontend);
// used identically by both the REST CORS config and socket.io's CORS config so
// the two don't drift out of sync the way they had before this rewrite.
export const allowedOrigins: string[] = env.CLIENT_URL.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
