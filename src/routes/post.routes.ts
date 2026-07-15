import { Router } from "express";
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  likePost,
  dislikePost,
} from "../controllers/post.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { postMutationRateLimiter } from "../middleware/rateLimit.middleware.js";
import { uploadImage } from "../middleware/upload.middleware.js";
import { createPostSchema, updatePostSchema, listPostsQuerySchema } from "../validators/post.validators.js";
import { idParamOnlySchema } from "../validators/common.js";

const router = Router();

router.get("/", validate(listPostsQuerySchema), getPosts);
router.get("/:id", validate(idParamOnlySchema), getPost);

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
