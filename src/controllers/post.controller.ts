import { asyncHandler } from "../utils/asyncHandler.js";
import * as postService from "../services/post.service.js";
import * as reactionService from "../services/reaction.service.js";
import type { CreatePostInput, ListPostsQuery } from "../validators/post.validators.js";

export const getPosts = asyncHandler(async (req, res) => {
  const { cursor, limit, sortBy } = req.validatedQuery as ListPostsQuery;
  const result = await postService.getFeed({ cursor, limit, sortBy });
  res.json(result);
});

export const getPost = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const post = await postService.getPostById(id);
  res.json(post);
});

export const createPost = asyncHandler(async (req, res) => {
  const { content } = req.body as CreatePostInput;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
  const post = await postService.createPost({ userId: req.user!.id, content, imageUrl });
  res.status(201).json(post);
});

export const updatePost = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const { content, removeImage } = req.body as { content: string; removeImage?: boolean };
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
  const post = await postService.updatePost(id, req.user!.id, content, { imageUrl, removeImage });
  res.json(post);
});

export const deletePost = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const result = await postService.deletePost(id, req.user!.id);
  res.json(result);
});

export const likePost = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const result = await reactionService.toggleReaction("Post", id, req.user!.id, "like");
  res.json(result);
});

export const dislikePost = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const result = await reactionService.toggleReaction("Post", id, req.user!.id, "dislike");
  res.json(result);
});
