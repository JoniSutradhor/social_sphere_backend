import { env } from "./env.js";

export const allowedOrigins: string[] = env.CLIENT_URL.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
