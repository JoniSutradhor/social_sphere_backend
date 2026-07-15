import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export interface IPost {
  user: mongoose.Types.ObjectId;
  content: string;
  imageUrl: string | null;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type PostModel = Model<IPost>;
export type PostDocument = HydratedDocument<IPost>;

const postSchema = new Schema<IPost, PostModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
      maxlength: [5000, "Post cannot exceed 5000 characters"],
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
    commentCount: {
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

// Feed listing, newest-first (keyset cursor on createdAt/_id).
postSchema.index({ isDeleted: 1, createdAt: -1, _id: -1 });
// Feed listing, most-liked-first.
postSchema.index({ isDeleted: 1, likeCount: -1, createdAt: -1, _id: -1 });

export const Post = mongoose.model<IPost, PostModel>("Post", postSchema);
