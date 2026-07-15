import mongoose from "mongoose";
import { Post, type IPost } from "../models/post.model.js";
import { Reaction } from "../models/reaction.model.js";
import { ForbiddenError, NotFoundError } from "../utils/ApiError.js";
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

export const getFeed = async (options: {
  cursor?: string;
  limit: number;
  sortBy: "newest" | "mostLiked";
}) => {
  const filter: mongoose.FilterQuery<IPost> = { isDeleted: false };

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

  const docs = await Post.find(filter)
    .sort(sort)
    .limit(options.limit + 1)
    .populate("user", USER_PROJECTION)
    .lean();

  return buildPage(docs, options.limit, options.sortBy);
};

export const getPostById = async (postId: string) => {
  const post = await Post.findById(postId).populate("user", USER_PROJECTION);

  if (!post || post.isDeleted) {
    throw new NotFoundError("Post not found");
  }

  return post;
};

export const createPost = async (input: { userId: string; content: string; imageUrl?: string }) => {
  const post = await Post.create({
    user: input.userId,
    content: input.content,
    imageUrl: input.imageUrl ?? null,
  });

  return post.populate("user", USER_PROJECTION);
};

export const updatePost = async (
  postId: string,
  userId: string,
  content: string,
  options: { imageUrl?: string; removeImage?: boolean } = {}
) => {
  const post = await Post.findById(postId);

  if (!post || post.isDeleted) {
    throw new NotFoundError("Post not found");
  }

  if (post.user.toString() !== userId) {
    throw new ForbiddenError("Not authorized to update this post");
  }

  const oldImageUrl = post.imageUrl;

  post.content = content;
  post.isEdited = true;

  if (options.imageUrl) {
    post.imageUrl = options.imageUrl;
  } else if (options.removeImage) {
    post.imageUrl = null;
  }

  await post.save();

  // Replaced or explicitly cleared — the old file is now orphaned, clean it up.
  if (oldImageUrl && oldImageUrl !== post.imageUrl) {
    deleteUploadedFile(oldImageUrl);
  }

  const populated = await post.populate("user", USER_PROJECTION);
  emitToPost(String(post._id), "post-updated", populated);

  return populated;
};

export const deletePost = async (postId: string, userId: string) => {
  const post = await Post.findById(postId);

  if (!post || post.isDeleted) {
    throw new NotFoundError("Post not found");
  }

  if (post.user.toString() !== userId) {
    throw new ForbiddenError("Not authorized to delete this post");
  }

  const { imageUrl } = post;

  if (post.commentCount > 0) {
    post.isDeleted = true;
    post.content = "[deleted]";
    post.imageUrl = null;
    await post.save();
  } else {
    await post.deleteOne();
    // No comments reference this post, so the only orphan risk is its own reactions.
    await Reaction.deleteMany({ targetType: "Post", targetId: post._id });
  }

  if (imageUrl) {
    deleteUploadedFile(imageUrl);
  }

  emitToPost(String(post._id), "post-deleted", { id: post.id });

  return { message: "Post deleted successfully" };
};
