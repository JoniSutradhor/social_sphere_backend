import { Router } from "express";
import {
  getComments,
  getReplies,
  getCommentLikes,
  createComment,
  addReply,
  updateComment,
  deleteComment,
  likeComment,
  dislikeComment,
} from "../controllers/comment.controller.js";
import { protect, optionalAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { commentMutationRateLimiter } from "../middleware/rateLimit.middleware.js";
import { uploadImage } from "../middleware/upload.middleware.js";
import {
  createCommentSchema,
  updateCommentSchema,
  addReplySchema,
  listCommentsQuerySchema,
  listRepliesQuerySchema,
} from "../validators/comment.validators.js";
import { idParamOnlySchema, listReactorsQuerySchema } from "../validators/common.js";

const router = Router();

router.get("/", optionalAuth, validate(listCommentsQuerySchema), getComments);
router.get("/:id/replies", optionalAuth, validate(listRepliesQuerySchema), getReplies);
router.get("/:id/likes", optionalAuth, validate(listReactorsQuerySchema), getCommentLikes);

router.post(
  "/",
  protect,
  commentMutationRateLimiter,
  uploadImage,
  validate(createCommentSchema),
  createComment
);
router.put(
  "/:id",
  protect,
  commentMutationRateLimiter,
  uploadImage,
  validate(updateCommentSchema),
  updateComment
);
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
