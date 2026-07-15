import { Router } from "express";
import {
  getPosts,
  getPost,
  getPostLikes,
  createPost,
  updatePost,
  deletePost,
  likePost,
  dislikePost,
} from "../controllers/post.controller.js";
import { protect, optionalAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { postMutationRateLimiter } from "../middleware/rateLimit.middleware.js";
import { uploadImage } from "../middleware/upload.middleware.js";
import { createPostSchema, updatePostSchema, listPostsQuerySchema } from "../validators/post.validators.js";
import { idParamOnlySchema, listReactorsQuerySchema } from "../validators/common.js";

const router = Router();

router.get("/", optionalAuth, validate(listPostsQuerySchema), getPosts);
router.get("/:id", optionalAuth, validate(idParamOnlySchema), getPost);
router.get("/:id/likes", optionalAuth, validate(listReactorsQuerySchema), getPostLikes);

router.post(
  "/",
  protect,
  postMutationRateLimiter,
  uploadImage,
  validate(createPostSchema),
  createPost
);
router.put(
  "/:id",
  protect,
  postMutationRateLimiter,
  uploadImage,
  validate(updatePostSchema),
  updatePost
);
router.delete(
  "/:id",
  protect,
  postMutationRateLimiter,
  validate(idParamOnlySchema),
  deletePost
);
router.post(
  "/:id/like",
  protect,
  postMutationRateLimiter,
  validate(idParamOnlySchema),
  likePost
);
router.post(
  "/:id/dislike",
  protect,
  postMutationRateLimiter,
  validate(idParamOnlySchema),
  dislikePost
);

export default router;
