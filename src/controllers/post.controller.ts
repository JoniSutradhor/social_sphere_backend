import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import * as postService from "../services/post.service.js";
import * as reactionService from "../services/reaction.service.js";
import type { CreatePostInput, ListPostsQuery, UpdatePostInput } from "../validators/post.validators.js";
import type { ListReactorsQuery } from "../validators/common.js";

export const getPosts = asyncHandler(async (req, res) => {
  const { cursor, limit, sortBy } = req.validatedQuery as ListPostsQuery;
  const { data, pagination } = await postService.getFeed({ cursor, limit, sortBy }, req.user?.id);
  sendSuccess(res, { message: "Posts fetched successfully", data, pagination });
});

export const getPost = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const post = await postService.getPostById(id, req.user?.id);
  sendSuccess(res, { message: "Post fetched successfully", data: post });
});

export const getPostLikes = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const { cursor, limit } = req.validatedQuery as ListReactorsQuery;
  const { data, pagination } = await reactionService.getReactors("Post", id, "like", req.user?.id, {
    cursor,
    limit,
  });
  sendSuccess(res, { message: "Post likes fetched successfully", data, pagination });
});

export const createPost = asyncHandler(async (req, res) => {
  const { content, visibility } = req.body as CreatePostInput;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
  const post = await postService.createPost({ userId: req.user!.id, content, imageUrl, visibility });
  sendSuccess(res, { statusCode: 201, message: "Post created successfully", data: post });
});

export const updatePost = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const { content, removeImage, visibility } = req.body as UpdatePostInput;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
  const post = await postService.updatePost(id, req.user!.id, content, { imageUrl, removeImage, visibility });
  sendSuccess(res, { message: "Post updated successfully", data: post });
});

export const deletePost = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const { message } = await postService.deletePost(id, req.user!.id);
  sendSuccess(res, { message });
});

export const likePost = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const result = await reactionService.toggleReaction("Post", id, req.user!.id, "like");
  sendSuccess(res, { message: "Reaction updated successfully", data: result });
});

export const dislikePost = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const result = await reactionService.toggleReaction("Post", id, req.user!.id, "dislike");
  sendSuccess(res, { message: "Reaction updated successfully", data: result });
});
