import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { allowedOrigins } from "../config/cors.js";
import { logger } from "../utils/logger.js";
import { setSocketServer } from "./emitter.js";

const joinPostSchema = z.string().trim().min(1).max(200);

interface HandshakeAuthPayload {
  id: string;
}

interface SocketData {
  userId?: string;
}

/**
 * Client -> server events are limited to room membership (`join-post`/`leave-post`).
 * All post/comment/reaction mutation events are emitted server-side (see src/sockets/emitter.ts),
 * only after a mutation is actually persisted via the authenticated REST path — clients
 * can no longer forge a fake `new-comment`/`comment-liked`/etc event for content that
 * doesn't exist, which the previous implementation allowed.
 */
export const initSockets = (httpServer: HttpServer): SocketIOServer => {
  const io = new SocketIOServer<any, any, any, SocketData>(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
    },
  });

  // Anonymous connections stay allowed (mirrors the public GET /api/comments route);
  // a valid JWT just attaches the authenticated user id for potential future use.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      return next();
    }

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as HandshakeAuthPayload;
      socket.data.userId = payload.id;
    } catch {
      // Stale/expired token on an otherwise-anonymous-allowed socket: ignore
      // rather than reject, so it doesn't just break real-time updates for a
      // valid read-only viewer.
    }

    next();
  });

  io.on("connection", (socket) => {
    logger.debug({ socketId: socket.id, userId: socket.data.userId }, "Socket connected");

    socket.on("join-post", (postId: unknown) => {
      const parsed = joinPostSchema.safeParse(postId);
      if (!parsed.success) return;
      socket.join(parsed.data);
    });

    socket.on("leave-post", (postId: unknown) => {
      const parsed = joinPostSchema.safeParse(postId);
      if (!parsed.success) return;
      socket.leave(parsed.data);
    });

    socket.on("disconnect", () => {
      logger.debug({ socketId: socket.id }, "Socket disconnected");
    });
  });

  setSocketServer(io);
  return io;
};
