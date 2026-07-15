import mongoose from "mongoose";
import { Comment, type CommentDocument } from "../models/comment.model.js";
import { Post } from "../models/post.model.js";
import { Reaction, type ReactionTargetType, type ReactionType } from "../models/reaction.model.js";
import { NotFoundError } from "../utils/ApiError.js";
import { emitToPost } from "../sockets/emitter.js";

const COUNT_FIELD = {
  like: "likeCount",
  dislike: "dislikeCount",
} as const;

export const toggleReaction = async (
  targetType: ReactionTargetType,
  targetId: string,
  userId: string,
  type: ReactionType
) => {
  const session = await mongoose.startSession();

  try {
    let result:
      | { likeCount: number; dislikeCount: number; userReaction: ReactionType | null; postId: string }
      | undefined;

    await session.withTransaction(async () => {
      const target =
        targetType === "Post"
          ? await Post.findById(targetId).session(session)
          : await Comment.findById(targetId).session(session);

      if (!target || target.isDeleted) {
        throw new NotFoundError(`${targetType} not found`);
      }

      const existing = await Reaction.findOne({ targetType, targetId, userId }).session(session);

      let userReaction: ReactionType | null = type;

      if (!existing) {
        await Reaction.create([{ targetType, targetId, userId, type }], { session });
        target[COUNT_FIELD[type]] += 1;
      } else if (existing.type === type) {
        await existing.deleteOne({ session });
        target[COUNT_FIELD[type]] = Math.max(0, target[COUNT_FIELD[type]] - 1);
        userReaction = null;
      } else {
        const previousType = existing.type;
        existing.type = type;
        await existing.save({ session });
        target[COUNT_FIELD[previousType]] = Math.max(0, target[COUNT_FIELD[previousType]] - 1);
        target[COUNT_FIELD[type]] += 1;
      }

      await target.save({ session });

      result = {
        likeCount: target.likeCount,
        dislikeCount: target.dislikeCount,
        userReaction,
        postId: targetType === "Post" ? String(target._id) : String((target as CommentDocument).postId),
      };
    });

    if (!result) {
      throw new NotFoundError(`${targetType} not found`);
    }

    emitToPost(
      result.postId,
      targetType === "Post" ? "post-reaction-updated" : "comment-reaction-updated",
      {
        [targetType === "Post" ? "postId" : "commentId"]: targetId,
        likeCount: result.likeCount,
        dislikeCount: result.dislikeCount,
      }
    );

    return result;
  } finally {
    await session.endSession();
  }
};
