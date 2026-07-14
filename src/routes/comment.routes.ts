import { Router } from "express";
import {
  getComments,
  getReplies,
  createComment,
  addReply,
  updateComment,
  deleteComment,
  likeComment,
  dislikeComment,
} from "../controllers/comment.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { commentMutationRateLimiter } from "../middleware/rateLimit.middleware.js";
import {
  createCommentSchema,
  updateCommentSchema,
  idParamOnlySchema,
  addReplySchema,
  listCommentsQuerySchema,
  listRepliesQuerySchema,
} from "../validators/comment.validators.js";

const router = Router();

router.get("/", validate(listCommentsQuerySchema), getComments);
router.get("/:id/replies", validate(listRepliesQuerySchema), getReplies);

router.post("/", protect, commentMutationRateLimiter, validate(createCommentSchema), createComment);
router.put("/:id", protect, commentMutationRateLimiter, validate(updateCommentSchema), updateComment);
router.delete(
  "/:id",
  protect,
  commentMutationRateLimiter,
  validate(idParamOnlySchema),
  deleteComment
);
router.post(
  "/:id/like",
  protect,
  commentMutationRateLimiter,
  validate(idParamOnlySchema),
  likeComment
);
router.post(
  "/:id/dislike",
  protect,
  commentMutationRateLimiter,
  validate(idParamOnlySchema),
  dislikeComment
);
router.post(
  "/:id/reply",
  protect,
  commentMutationRateLimiter,
  validate(addReplySchema),
  addReply
);

export default router;
