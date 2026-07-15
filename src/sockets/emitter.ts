import type { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

export const setSocketServer = (server: SocketIOServer): void => {
  io = server;
};

export const emitToPost = (postId: string, event: string, payload: unknown): void => {
  io?.to(postId).emit(event, payload);
};
