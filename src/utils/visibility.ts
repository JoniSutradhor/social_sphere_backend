import mongoose from "mongoose";
import { NotFoundError } from "./ApiError.js";

type UserRef = mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId };

const resolveUserId = (user: UserRef): string =>
  user instanceof mongoose.Types.ObjectId ? user.toString() : String(user._id);

export const assertPostVisible = (
  post: { visibility: "public" | "private"; user: UserRef },
  viewerId?: string
): void => {
  if (post.visibility === "private" && resolveUserId(post.user) !== viewerId) {
    throw new NotFoundError("Post not found");
  }
};
