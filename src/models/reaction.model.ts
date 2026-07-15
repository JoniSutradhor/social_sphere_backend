import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export type ReactionType = "like" | "dislike";
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

reactionSchema.index({ targetType: 1, targetId: 1, userId: 1 }, { unique: true });
reactionSchema.index({ targetType: 1, targetId: 1, type: 1, createdAt: -1, _id: -1 });

export const Reaction = mongoose.model<IReaction, ReactionModel>("Reaction", reactionSchema);
