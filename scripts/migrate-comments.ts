import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { Comment } from "../src/models/comment.model.js";
import { Reaction } from "../src/models/reaction.model.js";
import { logger } from "../src/utils/logger.js";

interface LegacyReply {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  content: string;
  createdAt?: Date;
}

interface LegacyComment {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  content: string;
  likes?: mongoose.Types.ObjectId[];
  dislikes?: mongoose.Types.ObjectId[];
  replies?: LegacyReply[];
  pageId?: string;
  parentId?: unknown;
  createdAt?: Date;
  updatedAt?: Date;
}

const run = async () => {
  await connectDB();
  const rawCollection = mongoose.connection.db!.collection<LegacyComment>("comments");

  const legacyDocs = await rawCollection.find({ parentId: { $exists: false } }).toArray();

  if (legacyDocs.length === 0) {
    logger.info("No legacy comment documents to migrate.");
    await mongoose.disconnect();
    return;
  }

  let commentsMigrated = 0;
  let repliesSplit = 0;
  let reactionsCreated = 0;

  for (const doc of legacyDocs) {
    const likes = doc.likes ?? [];
    const dislikes = doc.dislikes ?? [];
    const replies = doc.replies ?? [];
    const pageId = doc.pageId ?? "main";

    await rawCollection.updateOne(
      { _id: doc._id },
      {
        $set: {
          parentId: null,
          rootId: null,
          likeCount: likes.length,
          dislikeCount: dislikes.length,
          replyCount: replies.length,
          isEdited: false,
          isDeleted: false,
        },
        $unset: { likes: "", dislikes: "", replies: "" },
      }
    );
    commentsMigrated += 1;

    if (likes.length > 0 || dislikes.length > 0) {
      await Reaction.insertMany(
        [
          ...likes.map((userId) => ({
            targetType: "Comment" as const,
            targetId: doc._id,
            userId,
            type: "like" as const,
            createdAt: doc.createdAt ?? new Date(),
            updatedAt: doc.createdAt ?? new Date(),
          })),
          ...dislikes.map((userId) => ({
            targetType: "Comment" as const,
            targetId: doc._id,
            userId,
            type: "dislike" as const,
            createdAt: doc.createdAt ?? new Date(),
            updatedAt: doc.createdAt ?? new Date(),
          })),
        ],
        { ordered: false }
      );
      reactionsCreated += likes.length + dislikes.length;
    }

    if (replies.length > 0) {
      await rawCollection.insertMany(
        replies.map((reply) => ({
          _id: new mongoose.Types.ObjectId(),
          user: reply.user,
          pageId,
          parentId: doc._id,
          rootId: doc._id,
          content: reply.content,
          likeCount: 0,
          dislikeCount: 0,
          replyCount: 0,
          isEdited: false,
          isDeleted: false,
          createdAt: reply.createdAt ?? new Date(),
          updatedAt: reply.createdAt ?? new Date(),
        }))
      );
      repliesSplit += replies.length;
    }
  }

  await Comment.syncIndexes();
  await Reaction.syncIndexes();

  logger.info(
    { commentsMigrated, repliesSplit, reactionsCreated },
    "Migration complete"
  );

  await mongoose.disconnect();
};

run().catch((error) => {
  logger.error({ err: error }, "Migration failed");
  process.exit(1);
});
