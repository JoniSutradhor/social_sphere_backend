import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User, type UserDocument } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ConflictError, UnauthorizedError } from "../utils/ApiError.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import type { RegisterInput, LoginInput } from "../validators/auth.validators.js";

const generateToken = (id: string): string => jwt.sign({ id }, env.JWT_SECRET, { expiresIn: "7d" });

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;

const toPublicUser = (user: UserDocument) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
});

export const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password } = req.body as RegisterInput;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ConflictError("User already exists with this email");
  }

  let user;
  try {
    user = await User.create({ firstName, lastName, email, password });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new ConflictError("User already exists with this email");
    }
    throw error;
  }

  sendSuccess(res, {
    statusCode: 201,
    message: "Registration successful",
    data: {
      token: generateToken(user.id),
      user: toPublicUser(user),
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body as LoginInput;

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw new UnauthorizedError("Invalid email or password");
  }

  sendSuccess(res, {
    message: "Login successful",
    data: {
      token: generateToken(user.id),
      user: toPublicUser(user),
    },
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  sendSuccess(res, {
    message: "Current user fetched successfully",
    data: { user: toPublicUser(req.user!) },
  });
});
