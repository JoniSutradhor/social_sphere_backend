import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export type ReactionType = "like" | "dislike";
// Doubles as the Mongoose model name for `targetId`'s refPath.
export type ReactionTargetType = "Post" | "Comment";

export interface IReaction {
  targetType: ReactionTargetType;
  targetId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: ReactionType;
  createdAt: Date;
  updatedAt: Date;
}

type ReactionModel = Model<IReaction>;
export type ReactionDocument = HydratedDocument<IReaction>;

const reactionSchema = new Schema<IReaction, ReactionModel>(
  {
    targetType: {
      type: String,
      enum: ["Post", "Comment"],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "targetType",
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

// One reaction per user per target; also the lookup index for "did this user already react".
reactionSchema.index({ targetType: 1, targetId: 1, userId: 1 }, { unique: true });

export const Reaction = mongoose.model<IReaction, ReactionModel>("Reaction", reactionSchema);
