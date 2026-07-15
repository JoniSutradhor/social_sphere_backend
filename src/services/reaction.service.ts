import mongoose from "mongoose";
import { Comment, type CommentDocument } from "../models/comment.model.js";
import { Post, type PostDocument } from "../models/post.model.js";
import { Reaction, type IReaction, type ReactionTargetType, type ReactionType } from "../models/reaction.model.js";
import { NotFoundError } from "../utils/ApiError.js";
import { assertPostVisible } from "../utils/visibility.js";
import {
  dateIdSeekFilter,
  decodeCursor,
  encodeCursor,
  type DateIdCursor,
} from "../utils/pagination.js";
import { emitToPost } from "../sockets/emitter.js";

const COUNT_FIELD = {
  like: "likeCount",
  dislike: "dislikeCount",
} as const;

const USER_PROJECTION = "firstName lastName avatar";

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

      const post =
        targetType === "Post"
          ? (target as PostDocument)
          : await Post.findById((target as CommentDocument).postId).session(session);
      if (!post || post.isDeleted) {
        throw new NotFoundError("Post not found");
      }
      assertPostVisible(post, userId);

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

export const attachViewerReactions = async <T extends { _id: mongoose.Types.ObjectId }>(
  items: T[],
  targetType: ReactionTargetType,
  viewerId?: string
): Promise<(T & { userReaction: ReactionType | null })[]> => {
  if (!viewerId || items.length === 0) {
    return items.map((item) => ({ ...item, userReaction: null }));
  }

  const reactions = await Reaction.find({
    targetType,
    targetId: { $in: items.map((item) => item._id) },
    userId: viewerId,
  }).lean();

  const reactionByTarget = new Map(reactions.map((r) => [String(r.targetId), r.type]));

  return items.map((item) => ({
    ...item,
    userReaction: reactionByTarget.get(String(item._id)) ?? null,
  }));
};

export const getReactors = async (
  targetType: ReactionTargetType,
  targetId: string,
  type: ReactionType,
  viewerId: string | undefined,
  options: { cursor?: string; limit: number }
) => {
  if (targetType === "Post") {
    const post = await Post.findById(targetId).select("user visibility isDeleted");
    if (!post || post.isDeleted) {
      throw new NotFoundError("Post not found");
    }
    assertPostVisible(post, viewerId);
  } else {
    const comment = await Comment.findById(targetId).select("postId isDeleted");
    if (!comment || comment.isDeleted) {
      throw new NotFoundError("Comment not found");
    }
    const post = await Post.findById(comment.postId).select("user visibility isDeleted");
    if (!post || post.isDeleted) {
      throw new NotFoundError("Post not found");
    }
    assertPostVisible(post, viewerId);
  }

  const filter: mongoose.FilterQuery<IReaction> = { targetType, targetId, type };

  if (options.cursor) {
    const decoded = decodeCursor<DateIdCursor>(options.cursor);
    Object.assign(filter, dateIdSeekFilter(decoded, "desc"));
  }

  const docs = await Reaction.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(options.limit + 1)
    .populate("userId", USER_PROJECTION)
    .lean();

  const hasMore = docs.length > options.limit;
  const page = hasMore ? docs.slice(0, options.limit) : docs;
  const last = page[page.length - 1];

  const nextCursor =
    hasMore && last
      ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: String(last._id) })
      : null;

  return {
    data: page.map((r) => ({ user: r.userId, reactedAt: r.createdAt })),
    pagination: { nextCursor, hasMore },
  };
};
