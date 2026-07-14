import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export type ReactionType = "like" | "dislike";

export interface IReaction {
  commentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: ReactionType;
  createdAt: Date;
  updatedAt: Date;
}

type ReactionModel = Model<IReaction>;
export type ReactionDocument = HydratedDocument<IReaction>;

const reactionSchema = new Schema<IReaction, ReactionModel>(
  {
    commentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["like", "dislike"],
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// One reaction per user per comment; also the lookup index for "did this user already react".
reactionSchema.index({ commentId: 1, userId: 1 }, { unique: true });

export const Reaction = mongoose.model<IReaction, ReactionModel>("Reaction", reactionSchema);
