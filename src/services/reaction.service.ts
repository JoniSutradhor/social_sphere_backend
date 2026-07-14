import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Reaction, type ReactionType } from "../models/reaction.model.js";
import { NotFoundError } from "../utils/ApiError.js";
import { emitToPage } from "../sockets/emitter.js";

const COUNT_FIELD = {
  like: "likeCount",
  dislike: "dislikeCount",
} as const;

export const toggleReaction = async (commentId: string, userId: string, type: ReactionType) => {
  const session = await mongoose.startSession();

  try {
    let result:
      | { likeCount: number; dislikeCount: number; userReaction: ReactionType | null; pageId: string }
      | undefined;

    await session.withTransaction(async () => {
      const comment = await Comment.findById(commentId).session(session);
      if (!comment || comment.isDeleted) {
        throw new NotFoundError("Comment not found");
      }

      const existing = await Reaction.findOne({ commentId, userId }).session(session);

      let userReaction: ReactionType | null = type;

      if (!existing) {
        await Reaction.create([{ commentId, userId, type }], { session });
        comment[COUNT_FIELD[type]] += 1;
      } else if (existing.type === type) {
        await existing.deleteOne({ session });
        comment[COUNT_FIELD[type]] = Math.max(0, comment[COUNT_FIELD[type]] - 1);
        userReaction = null;
      } else {
        const previousType = existing.type;
        existing.type = type;
        await existing.save({ session });
        comment[COUNT_FIELD[previousType]] = Math.max(0, comment[COUNT_FIELD[previousType]] - 1);
        comment[COUNT_FIELD[type]] += 1;
      }

      await comment.save({ session });

      result = {
        likeCount: comment.likeCount,
        dislikeCount: comment.dislikeCount,
        userReaction,
        pageId: comment.pageId,
      };
    });

    if (!result) {
      throw new NotFoundError("Comment not found");
    }

    emitToPage(result.pageId, "comment-reaction-updated", {
      commentId,
      likeCount: result.likeCount,
      dislikeCount: result.dislikeCount,
    });

    return result;
  } finally {
    await session.endSession();
  }
};
