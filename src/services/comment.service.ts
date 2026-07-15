import mongoose from "mongoose";
import { Comment, type IComment } from "../models/comment.model.js";
import { Post } from "../models/post.model.js";
import { Reaction } from "../models/reaction.model.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/ApiError.js";
import {
  countDateIdSeekFilter,
  dateIdSeekFilter,
  decodeCursor,
  encodeCursor,
  type CountDateIdCursor,
  type DateIdCursor,
} from "../utils/pagination.js";
import { emitToPost } from "../sockets/emitter.js";
import { deleteUploadedFile } from "../middleware/upload.middleware.js";

const USER_PROJECTION = "firstName lastName avatar";

interface CursorPage<T> {
  data: T[];
  pagination: { nextCursor: string | null; hasMore: boolean };
}

const buildPage = <T extends { _id: mongoose.Types.ObjectId; createdAt: Date; likeCount: number }>(
  docs: T[],
  limit: number,
  sortBy: "newest" | "mostLiked"
): CursorPage<T> => {
  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;
  const last = page[page.length - 1];

  const nextCursor =
    hasMore && last
      ? encodeCursor(
          sortBy === "mostLiked"
            ? { count: last.likeCount, createdAt: last.createdAt.toISOString(), id: String(last._id) }
            : { createdAt: last.createdAt.toISOString(), id: String(last._id) }
        )
      : null;

  return { data: page, pagination: { nextCursor, hasMore } };
};

export const getTopLevelComments = async (
  postId: string,
  options: { cursor?: string; limit: number; sortBy: "newest" | "mostLiked" }
) => {
  const filter: mongoose.FilterQuery<IComment> = { postId, parentId: null, isDeleted: false };

  if (options.cursor) {
    if (options.sortBy === "mostLiked") {
      const decoded = decodeCursor<CountDateIdCursor>(options.cursor);
      Object.assign(filter, countDateIdSeekFilter(decoded, "likeCount"));
    } else {
      const decoded = decodeCursor<DateIdCursor>(options.cursor);
      Object.assign(filter, dateIdSeekFilter(decoded, "desc"));
    }
  }

  const sort: Record<string, 1 | -1> =
    options.sortBy === "mostLiked"
      ? { likeCount: -1, createdAt: -1, _id: -1 }
      : { createdAt: -1, _id: -1 };

  const docs = await Comment.find(filter)
    .sort(sort)
    .limit(options.limit + 1)
    .populate("user", USER_PROJECTION)
    .lean();

  return buildPage(docs, options.limit, options.sortBy);
};

export const getReplies = async (
  parentId: string,
  options: { cursor?: string; limit: number }
) => {
  const filter: mongoose.FilterQuery<IComment> = { parentId, isDeleted: false };

  if (options.cursor) {
    const decoded = decodeCursor<DateIdCursor>(options.cursor);
    Object.assign(filter, dateIdSeekFilter(decoded, "asc"));
  }

  const docs = await Comment.find(filter)
    .sort({ createdAt: 1, _id: 1 })
    .limit(options.limit + 1)
    .populate("user", USER_PROJECTION)
    .lean();

  return buildPage(docs, options.limit, "newest");
};

export const createComment = async (input: {
  userId: string;
  content: string;
  postId?: string;
  parentId?: string;
  imageUrl?: string;
}) => {
  let rootId: mongoose.Types.ObjectId | null = null;
  let postId = input.postId;

  if (input.parentId) {
    const parent = await Comment.findById(input.parentId);
    if (!parent || parent.isDeleted) {
      throw new NotFoundError("Parent comment not found");
    }
    if (parent.parentId) {
      throw new BadRequestError("Cannot reply to a reply");
    }
    rootId = parent._id;
    // A reply always belongs to its parent's post — never trust a client-supplied
    // postId here, or a reply could be spoofed onto an unrelated post's stream.
    postId = String(parent.postId);
  } else {
    if (!postId) {
      throw new BadRequestError("postId is required");
    }
    const post = await Post.findById(postId);
    if (!post || post.isDeleted) {
      throw new NotFoundError("Post not found");
    }
  }

  const comment = await Comment.create({
    user: input.userId,
    postId,
    parentId: input.parentId ?? null,
    rootId,
    content: input.content,
    imageUrl: input.imageUrl ?? null,
  });

  if (input.parentId) {
    await Comment.findByIdAndUpdate(input.parentId, { $inc: { replyCount: 1 } });
  }
  await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });

  const populated = await comment.populate("user", USER_PROJECTION);
  emitToPost(postId, "comment-created", populated);

  return populated;
};

export const updateComment = async (
  commentId: string,
  userId: string,
  content: string,
  options: { imageUrl?: string; removeImage?: boolean } = {}
) => {
  const comment = await Comment.findById(commentId);

  if (!comment || comment.isDeleted) {
    throw new NotFoundError("Comment not found");
  }

  if (comment.user.toString() !== userId) {
    throw new ForbiddenError("Not authorized to update this comment");
  }

  const oldImageUrl = comment.imageUrl;

  comment.content = content;
  comment.isEdited = true;

  if (options.imageUrl) {
    comment.imageUrl = options.imageUrl;
  } else if (options.removeImage) {
    comment.imageUrl = null;
  }

  await comment.save();

  // Replaced or explicitly cleared — the old file is now orphaned, clean it up.
  if (oldImageUrl && oldImageUrl !== comment.imageUrl) {
    deleteUploadedFile(oldImageUrl);
  }

  const populated = await comment.populate("user", USER_PROJECTION);
  emitToPost(String(comment.postId), "comment-updated", populated);

  return populated;
};

export const deleteComment = async (commentId: string, userId: string) => {
  const comment = await Comment.findById(commentId);

  if (!comment || comment.isDeleted) {
    throw new NotFoundError("Comment not found");
  }

  if (comment.user.toString() !== userId) {
    throw new ForbiddenError("Not authorized to delete this comment");
  }

  const { imageUrl } = comment;

  if (comment.replyCount > 0) {
    comment.isDeleted = true;
    comment.content = "[deleted]";
    comment.imageUrl = null;
    await comment.save();
  } else {
    await comment.deleteOne();
    // Comment is gone for good (unlike the soft-delete tombstone above, which
    // keeps the record around) — its reactions would otherwise sit orphaned
    // in the Reaction collection forever.
    await Reaction.deleteMany({ targetType: "Comment", targetId: comment._id });
    if (comment.parentId) {
      await Comment.findByIdAndUpdate(comment.parentId, { $inc: { replyCount: -1 } });
    }
    await Post.findByIdAndUpdate(comment.postId, { $inc: { commentCount: -1 } });
  }

  if (imageUrl) {
    deleteUploadedFile(imageUrl);
  }

  emitToPost(String(comment.postId), "comment-deleted", { id: comment.id, parentId: comment.parentId });

  return { message: "Comment deleted successfully" };
};
