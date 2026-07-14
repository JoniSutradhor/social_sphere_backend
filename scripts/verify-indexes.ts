import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { logger } from "../src/utils/logger.js";

const run = async () => {
  await connectDB();

  for (const name of ["users", "comments", "reactions"]) {
    const indexes = await mongoose.connection.db!.collection(name).indexes();
    logger.info({ collection: name, indexes }, "Indexes");
  }

  await mongoose.disconnect();
};

run().catch((error) => {
  logger.error({ err: error }, "Index verification failed");
  process.exit(1);
});
