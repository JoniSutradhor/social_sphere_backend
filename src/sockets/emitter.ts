import type { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

export const setSocketServer = (server: SocketIOServer): void => {
  io = server;
};

export const emitToPage = (pageId: string, event: string, payload: unknown): void => {
  io?.to(pageId).emit(event, payload);
};
