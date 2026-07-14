import { createServer } from "http";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { createApp } from "./app.js";
import { initSockets } from "./sockets/index.js";
import { logger } from "./utils/logger.js";

const start = async (): Promise<void> => {
  await connectDB();

  const app = createApp();
  const httpServer = createServer(app);
  initSockets(httpServer);

  httpServer.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT}`);
  });
};

start();
