import { asyncHandler } from "../utils/asyncHandler.js";
import * as commentService from "../services/comment.service.js";
import * as reactionService from "../services/reaction.service.js";
import type {
  CreateCommentInput,
  ListCommentsQuery,
  ListRepliesQuery,
} from "../validators/comment.validators.js";

export const getComments = asyncHandler(async (req, res) => {
  const { pageId, cursor, limit, sortBy } = req.validatedQuery as ListCommentsQuery;
  const result = await commentService.getTopLevelComments(pageId, { cursor, limit, sortBy });
  res.json(result);
});

export const getReplies = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const { cursor, limit } = req.validatedQuery as ListRepliesQuery;
  const result = await commentService.getReplies(id, { cursor, limit });
  res.json(result);
});

export const createComment = asyncHandler(async (req, res) => {
  const { content, pageId, parentId } = req.body as CreateCommentInput;
  const comment = await commentService.createComment({
    userId: req.user!.id,
    content,
    pageId,
    parentId,
  });
  res.status(201).json(comment);
});

export const addReply = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const { content } = req.body as { content: string };
  const comment = await commentService.createComment({
    userId: req.user!.id,
    content,
    parentId: id,
  });
  res.status(201).json(comment);
});

export const updateComment = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const { content } = req.body as { content: string };
  const comment = await commentService.updateComment(id, req.user!.id, content);
  res.json(comment);
});

export const deleteComment = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const result = await commentService.deleteComment(id, req.user!.id);
  res.json(result);
});

export const likeComment = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const result = await reactionService.toggleReaction(id, req.user!.id, "like");
  res.json(result);
});

export const dislikeComment = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const result = await reactionService.toggleReaction(id, req.user!.id, "dislike");
  res.json(result);
});
