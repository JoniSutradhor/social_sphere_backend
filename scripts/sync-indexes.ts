import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { Post } from "../src/models/post.model.js";
import { Comment } from "../src/models/comment.model.js";
import { Reaction } from "../src/models/reaction.model.js";
import { logger } from "../src/utils/logger.js";

const backfillLegacyReactions = async () => {
  const rawCollection = mongoose.connection.db!.collection("reactions");
  const legacyDocs = await rawCollection
    .find({ commentId: { $exists: true }, targetType: { $exists: false } })
    .toArray();

  for (const doc of legacyDocs) {
    await rawCollection.updateOne(
      { _id: doc._id },
      {
        $set: { targetType: "Comment", targetId: doc.commentId },
        $unset: { commentId: "" },
      }
    );
  }

  logger.info({ migrated: legacyDocs.length }, "Legacy reactions backfilled");
};

const run = async () => {
  await connectDB();

  await backfillLegacyReactions();

  for (const model of [Post, Comment, Reaction]) {
    const dropped = await model.syncIndexes();
    logger.info({ collection: model.collection.name, dropped }, "Indexes synced");
  }

  await mongoose.disconnect();
};

run().catch((error) => {
  logger.error({ err: error }, "Index sync failed");
  process.exit(1);
});
