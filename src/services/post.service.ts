import mongoose from "mongoose";
import { Post, type IPost, type PostVisibility } from "../models/post.model.js";
import { Reaction } from "../models/reaction.model.js";
import { ForbiddenError, NotFoundError } from "../utils/ApiError.js";
import { assertPostVisible } from "../utils/visibility.js";
import { attachViewerReactions } from "./reaction.service.js";
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

export const getFeed = async (
  options: { cursor?: string; limit: number; sortBy: "newest" | "mostLiked" },
  viewerId?: string
) => {
  const filter: mongoose.FilterQuery<IPost> = { isDeleted: false };
  const andClauses: mongoose.FilterQuery<IPost>[] = [
    viewerId ? { $or: [{ visibility: "public" }, { user: viewerId }] } : { visibility: "public" },
  ];

  if (options.cursor) {
    andClauses.push(
      options.sortBy === "mostLiked"
        ? countDateIdSeekFilter(decodeCursor<CountDateIdCursor>(options.cursor), "likeCount")
        : dateIdSeekFilter(decodeCursor<DateIdCursor>(options.cursor), "desc")
    );
  }

  filter.$and = andClauses;

  const sort: Record<string, 1 | -1> =
    options.sortBy === "mostLiked"
      ? { likeCount: -1, createdAt: -1, _id: -1 }
      : { createdAt: -1, _id: -1 };

  const docs = await Post.find(filter)
    .sort(sort)
    .limit(options.limit + 1)
    .populate("user", USER_PROJECTION)
    .lean();

  const page = buildPage(docs, options.limit, options.sortBy);
  const data = await attachViewerReactions(page.data, "Post", viewerId);

  return { ...page, data };
};

export const getPostById = async (postId: string, viewerId?: string) => {
  const post = await Post.findById(postId).populate("user", USER_PROJECTION).lean();

  if (!post || post.isDeleted) {
    throw new NotFoundError("Post not found");
  }
  assertPostVisible(post, viewerId);

  const [withReaction] = await attachViewerReactions([post], "Post", viewerId);
  return withReaction;
};

export const createPost = async (input: {
  userId: string;
  content: string;
  imageUrl?: string;
  visibility?: PostVisibility;
}) => {
  const post = await Post.create({
    user: input.userId,
    content: input.content,
    imageUrl: input.imageUrl ?? null,
    visibility: input.visibility ?? "public",
  });

  return post.populate("user", USER_PROJECTION);
};

export const updatePost = async (
  postId: string,
  userId: string,
  content: string,
  options: { imageUrl?: string; removeImage?: boolean; visibility?: PostVisibility } = {}
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

  if (options.visibility) {
    post.visibility = options.visibility;
  }

  await post.save();

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
    await Reaction.deleteMany({ targetType: "Post", targetId: post._id });
  }

  if (imageUrl) {
    deleteUploadedFile(imageUrl);
  }

  emitToPost(String(post._id), "post-deleted", { id: post.id });

  return { message: "Post deleted successfully" };
};
