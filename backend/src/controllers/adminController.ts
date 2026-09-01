import { Request, Response } from "express";
import { z } from "zod";
import { runIngestion, getIngestionStats } from "../services/eventIngestionService";
import {
  getAdminOpportunities,
  getOpportunityStats,
  updateOpportunity,
  setOpportunityStatus,
  computeOpportunityStatus,
  getOpportunityById,
} from "../services/opportunityService";
import {
  getInteractionCounts,
  getMostSearched,
  getMostPopularOpportunities,
} from "../services/interactionService";
import { Opportunity } from "@prisma/client";

/**
 * POST /api/admin/events/sync
 *
 * Triggers a full ingestion from the external Brabble API.
 * Protected by requireAdminAccess (x-admin-secret header OR an
 * authenticated admin JWT — see routes/admin.ts).
 *
 * Returns:
 * {
 *   success: true,
 *   fetched: number,
 *   created: number,
 *   updated: number,
 *   skipped: number,
 *   errors: number,
 *   lastSyncAt: string
 * }
 */
export async function triggerSync(req: Request, res: Response): Promise<void> {
  const start = Date.now();

  try {
    const summary = await runIngestion();
    res.json({
      success: true,
      ...summary,
      durationMs: Date.now() - start,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown ingestion error";
    console.error("[adminController] Sync failed:", message);

    // Return structured error — existing database data is unaffected
    res.status(502).json({
      success: false,
      error: message,
      hint: "Check BRABBLE_API_KEY in backend/.env. Existing database data is not affected.",
    });
  }
}

/**
 * GET /api/admin/events/stats
 *
 * Returns database statistics about opportunity sources (external-sync
 * focused: total/external/manual/lastSyncAt). See getDashboardStats below
 * for the fuller admin-dashboard breakdown (active/expired/closed).
 * Also protected by requireAdminAccess.
 */
export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = await getIngestionStats();
    res.json({ success: true, ...stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// OPPORTUNITY MANAGEMENT (Phase 15) — all requireAdmin (JWT admin role), not
// the shared secret. These are per-admin-user actions, not ops/script access.
// ══════════════════════════════════════════════════════════════════════════════

function serializeOpportunity(opp: Opportunity) {
  return { ...opp, status: computeOpportunityStatus(opp) };
}

/**
 * GET /api/admin/dashboard-stats
 * Total / Active / Expired / Closed / External / Manual counts + last sync.
 */
export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  try {
    const [counts, ingestion] = await Promise.all([
      getOpportunityStats(),
      getIngestionStats(),
    ]);
    res.json({
      success: true,
      ...counts,
      lastSyncAt: ingestion.lastSyncAt,
      lastSyncSource: ingestion.source,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
}

const listQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["live", "closed", "expired"]).optional(),
  source: z.enum(["manual", "external"]).optional(),
  category: z.string().optional(),
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
});

/**
 * GET /api/admin/opportunities
 * Paginated, searchable, filterable list for the admin table. Includes
 * closed/expired records — students never see this endpoint (requireAdmin).
 */
export async function listOpportunitiesAdmin(req: Request, res: Response): Promise<void> {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      status: "error",
      message: "Invalid query parameters",
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const result = await getAdminOpportunities(parsed.data);
    res.json({
      status: "success",
      data: result.data.map(serializeOpportunity),
      meta: { total: result.total, page: result.page, totalPages: result.totalPages },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ status: "error", message });
  }
}

// ── Edit ─────────────────────────────────────────────────────────────────────

const updateOpportunitySchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
    description: z.string().trim().min(10, "Description must be at least 10 characters"),
    category: z.enum(["HACKATHON", "INTERNSHIP", "WORKSHOP", "COMPETITION", "CONFERENCE", "SCHOLARSHIP"]),
    location: z.string().trim().min(1, "Location is required"),
    mode: z.enum(["ONLINE", "OFFLINE", "HYBRID"]),
    startDate: z.string().datetime({ message: "Invalid start date" }),
    endDate: z.string().datetime({ message: "Invalid end date" }).nullable().optional(),
    registrationDeadline: z.string().datetime({ message: "Invalid registration deadline" }),
    organizer: z.string().trim().min(1, "Organizer is required"),
    eligibility: z.string().trim().min(1, "Eligibility is required"),
    skills: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    registrationUrl: z.string().trim().url("Must be a valid URL"),
    relevanceScore: z.number().int().min(0).max(100),
    featured: z.boolean(),
    isFree: z.boolean().nullable().optional(),
  })
  .partial()
  .refine(
    (data) => !(data.startDate && data.endDate) || new Date(data.endDate!) >= new Date(data.startDate!),
    { message: "End date must be on or after the start date", path: ["endDate"] }
  );

/**
 * PATCH /api/admin/opportunities/:id
 * Partial update — only fields present in the body are changed. Every
 * present field is validated (non-empty title, valid URL, valid dates).
 */
export async function updateOpportunityAdmin(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await getOpportunityById(id);
  if (!existing) {
    res.status(404).json({ status: "error", message: `Opportunity with ID '${id}' not found` });
    return;
  }

  const parsed = updateOpportunitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      status: "error",
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { startDate, endDate, registrationDeadline, ...rest } = parsed.data;

  try {
    const updated = await updateOpportunity(id, {
      ...rest,
      ...(startDate ? { startDate: new Date(startDate) } : {}),
      ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
      ...(registrationDeadline ? { registrationDeadline: new Date(registrationDeadline) } : {}),
    });
    res.json({ status: "success", data: serializeOpportunity(updated) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ status: "error", message });
  }
}

// ── Status (deactivate / reactivate) ──────────────────────────────────────────

const statusSchema = z.object({
  isActive: z.boolean(),
});

/**
 * PATCH /api/admin/opportunities/:id/status
 * Soft close/reopen — never deletes the record.
 */
export async function setOpportunityStatusAdmin(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await getOpportunityById(id);
  if (!existing) {
    res.status(404).json({ status: "error", message: `Opportunity with ID '${id}' not found` });
    return;
  }

  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      status: "error",
      message: "Body must be { isActive: boolean }",
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const updated = await setOpportunityStatus(id, parsed.data.isActive);
    res.json({ status: "success", data: serializeOpportunity(updated) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ status: "error", message });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS (Phase 16) — every field here is an aggregate count or a group-by
// count; nothing in this payload identifies which student did what.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/analytics
 */
export async function getAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const [counts, mostSearched, mostPopular] = await Promise.all([
      getInteractionCounts(),
      getMostSearched(),
      getMostPopularOpportunities(),
    ]);

    // Flat shape — matches getDashboardStats' convention (frontend fetchers
    // for this admin panel treat the whole response body as the payload).
    res.json({
      success: true,
      ...counts,
      mostSearchedCategories: mostSearched.categories,
      mostSearchedLocations: mostSearched.locations,
      mostPopularOpportunities: mostPopular,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ status: "error", message });
  }
}
