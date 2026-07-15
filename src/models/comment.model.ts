import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export interface IComment {
  user: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
  parentId: mongoose.Types.ObjectId | null;
  rootId: mongoose.Types.ObjectId | null;
  content: string;
  imageUrl: string | null;
  likeCount: number;
  dislikeCount: number;
  replyCount: number;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type CommentModel = Model<IComment>;
export type CommentDocument = HydratedDocument<IComment>;

const commentSchema = new Schema<IComment, CommentModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    postId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    rootId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
      maxlength: [2000, "Comment cannot exceed 2000 characters"],
    },
    imageUrl: {
      type: String,
      default: null,
    },
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    dislikeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    replyCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Top-level comments for a post, newest-first (keyset cursor on createdAt/_id).
commentSchema.index({ postId: 1, parentId: 1, createdAt: -1, _id: -1 });
// Top-level comments for a post, most-liked-first.
commentSchema.index({ postId: 1, parentId: 1, likeCount: -1, createdAt: -1, _id: -1 });
// Replies of a given parent, oldest-first (thread reading order).
commentSchema.index({ parentId: 1, createdAt: 1, _id: 1 });
// Cheap whole-thread lookup by top-level ancestor; low-cost future-proofing for deeper nesting.
commentSchema.index({ rootId: 1, createdAt: 1 });

export const Comment = mongoose.model<IComment, CommentModel>("Comment", commentSchema);
