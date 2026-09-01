/**
 * admin.ts — Admin-only routes for data management
 *
 * Security model:
 *  - Sync/stats routes (Phase 12): accept EITHER the `x-admin-secret` header
 *    (unchanged, for scripts/ops/CI) OR an authenticated ADMIN user's JWT
 *    (new in Phase 15, for the browser admin UI). Either is sufficient.
 *  - Opportunity management routes (Phase 15 — list/edit/status): JWT admin
 *    role ONLY. These are per-admin-user actions with no legacy secret path.
 *  - Every admin route requires actual backend authorization — the frontend
 *    hiding admin buttons from students is NOT the security boundary.
 */

import { Router, Request, Response, NextFunction } from "express";
import { triggerSync, getStats, getDashboardStats, listOpportunitiesAdmin, updateOpportunityAdmin, setOpportunityStatusAdmin, getAnalytics } from "../controllers/adminController";
import { authenticate, requireAdmin, AuthRequest } from "../middleware/authenticate";

const adminRouter = Router();

// ── Dual admin guard: x-admin-secret OR authenticated admin JWT ─────────────

function requireAdminAccess(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.ADMIN_SYNC_SECRET;
  const provided = req.headers["x-admin-secret"];

  if (secret && provided === secret) {
    next();
    return;
  }

  // Fall through to JWT-based admin auth. authenticate() sends its own 401
  // response and does NOT call next() when the token is missing/invalid —
  // so this callback only ever runs on successful authentication.
  authenticate(req as AuthRequest, res, () => {
    requireAdmin(req as AuthRequest, res, next);
  });
}

// ── Routes: external sync (Phase 12, dual-gated) ─────────────────────────────

/**
 * POST /api/admin/events/sync
 * Fetch from Brabble API and upsert into PostgreSQL.
 */
adminRouter.post("/events/sync", requireAdminAccess, triggerSync);

/**
 * GET /api/admin/events/stats
 * Return opportunity counts by source.
 */
adminRouter.get("/events/stats", requireAdminAccess, getStats);

// ── Routes: opportunity management (Phase 15, JWT admin-role only) ──────────

adminRouter.use("/opportunities", authenticate, requireAdmin);
adminRouter.get("/opportunities", listOpportunitiesAdmin);
adminRouter.patch("/opportunities/:id", updateOpportunityAdmin);
adminRouter.patch("/opportunities/:id/status", setOpportunityStatusAdmin);

adminRouter.get("/dashboard-stats", authenticate, requireAdmin, getDashboardStats);

// ── Routes: analytics (Phase 16, JWT admin-role only, aggregate-only data) ──
adminRouter.get("/analytics", authenticate, requireAdmin, getAnalytics);

export default adminRouter;
