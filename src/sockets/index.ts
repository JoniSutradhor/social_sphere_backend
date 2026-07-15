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

export const initSockets = (httpServer: HttpServer): SocketIOServer => {
  const io = new SocketIOServer<any, any, any, SocketData>(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      return next();
    }

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as HandshakeAuthPayload;
      socket.data.userId = payload.id;
    } catch {
      // ignore invalid token
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
