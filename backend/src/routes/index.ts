import { Router } from "express";
import { healthCheck } from "../controllers/healthController";
import {
  listOpportunities,
  getOpportunity,
  addOpportunity,
} from "../controllers/opportunityController";
import authRoutes from "./auth";
import searchRouter from "./search";
import recommendationsRouter from "./recommendations";
import bookmarksRouter from "./bookmarks";
import adminRouter from "./admin";
import interactionsRouter from "./interactions";
import { optionalAuthenticate } from "../middleware/authenticate";

const router = Router();

// ─── Health ───────────────────────────────────────────────────────────────────
router.get("/health", healthCheck);

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.use("/auth", authRoutes);

// ─── AI Search ────────────────────────────────────────────────────────────────
router.use("/search", searchRouter);

// ─── Recommendations ──────────────────────────────────────────────────────────
router.use("/recommendations", recommendationsRouter);

// ─── Bookmarks ────────────────────────────────────────────────────────────────
router.use("/bookmarks", bookmarksRouter);

// ─── Activity tracking (Phase 16) ──────────────────────────────────────────────
router.use("/interactions", interactionsRouter);

// ─── Opportunities ────────────────────────────────────────────────────────────
// optionalAuthenticate: anonymous browsing works as before; a valid token
// additionally unlocks sort=ai_match (personalized ranking).
router.get("/opportunities", optionalAuthenticate, listOpportunities);
router.get("/opportunities/:id", getOpportunity);
router.post("/opportunities", addOpportunity);

// ─── Admin (sync + stats — protected by x-admin-secret) ─────────────────────
router.use("/admin", adminRouter);

export default router;
