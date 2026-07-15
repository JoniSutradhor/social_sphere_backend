import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import * as commentService from "../services/comment.service.js";
import * as reactionService from "../services/reaction.service.js";
import type {
  CreateCommentInput,
  ListCommentsQuery,
  ListRepliesQuery,
} from "../validators/comment.validators.js";
import type { ListReactorsQuery } from "../validators/common.js";

export const getComments = asyncHandler(async (req, res) => {
  const { postId, cursor, limit, sortBy } = req.validatedQuery as ListCommentsQuery;
  const { data, pagination } = await commentService.getTopLevelComments(postId, req.user?.id, {
    cursor,
    limit,
    sortBy,
  });
  sendSuccess(res, { message: "Comments fetched successfully", data, pagination });
});

export const getReplies = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const { cursor, limit } = req.validatedQuery as ListRepliesQuery;
  const { data, pagination } = await commentService.getReplies(id, req.user?.id, { cursor, limit });
  sendSuccess(res, { message: "Replies fetched successfully", data, pagination });
});

export const getCommentLikes = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const { cursor, limit } = req.validatedQuery as ListReactorsQuery;
  const { data, pagination } = await reactionService.getReactors("Comment", id, "like", req.user?.id, {
    cursor,
    limit,
  });
  sendSuccess(res, { message: "Comment likes fetched successfully", data, pagination });
});

export const createComment = asyncHandler(async (req, res) => {
  const { content, postId, parentId } = req.body as CreateCommentInput;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
  const comment = await commentService.createComment({
    userId: req.user!.id,
    content,
    postId,
    parentId,
    imageUrl,
  });
  sendSuccess(res, { statusCode: 201, message: "Comment created successfully", data: comment });
});

export const addReply = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const { content } = req.body as { content: string };
  const comment = await commentService.createComment({
    userId: req.user!.id,
    content,
    parentId: id,
  });
  sendSuccess(res, { statusCode: 201, message: "Reply added successfully", data: comment });
});

export const updateComment = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const { content, removeImage } = req.body as { content: string; removeImage?: boolean };
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
  const comment = await commentService.updateComment(id, req.user!.id, content, { imageUrl, removeImage });
  sendSuccess(res, { message: "Comment updated successfully", data: comment });
});

export const deleteComment = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const { message } = await commentService.deleteComment(id, req.user!.id);
  sendSuccess(res, { message });
});

export const likeComment = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const result = await reactionService.toggleReaction("Comment", id, req.user!.id, "like");
  sendSuccess(res, { message: "Reaction updated successfully", data: result });
});

export const dislikeComment = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const result = await reactionService.toggleReaction("Comment", id, req.user!.id, "dislike");
  sendSuccess(res, { message: "Reaction updated successfully", data: result });
});
