import { Router } from "express";
import authRoutes from "./auth.routes.js";
import commentRoutes from "./comment.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() });
});

router.use("/auth", authRoutes);
router.use("/comments", commentRoutes);

export default router;
