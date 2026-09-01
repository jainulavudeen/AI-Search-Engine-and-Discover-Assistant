import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  getOpportunities,
  getOpportunityById,
  createOpportunity,
  logSearchInteraction,
  parseCategoryEnum,
  OpportunityFilters,
} from "../services/opportunityService";
import { AuthRequest } from "../middleware/authenticate";

// ── Validation schemas ─────────────────────────────────────────────────────────

const listQuerySchema = z.object({
  search: z.string().optional(),
  // category/mode/eligibility/location accept a single value or a
  // comma-separated list (sidebar multi-select checkboxes, e.g.
  // "hackathon,internship"). Per-token enum validation happens inside
  // buildOpportunityWhere() — an unrecognized token is silently skipped
  // rather than rejecting the whole request.
  category: z.string().optional(),
  location: z.string().optional(),
  mode: z.string().optional(),
  eligibility: z.string().optional(),
  date: z.enum(["today", "week", "month", "next_month", "upcoming"]).optional(),
  domain: z
    .enum(["AI", "Machine Learning", "Web Development", "Cloud", "Cybersecurity", "Data Science", "IoT", "Other"])
    .optional(),
  registration: z.enum(["free", "paid"]).optional(),
  featured: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  page: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .optional(),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .optional(),
  sort: z.enum(["relevant", "deadline", "newest", "ai_match"]).optional(),
});

const createSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  category: z.enum(["HACKATHON", "INTERNSHIP", "WORKSHOP", "COMPETITION", "CONFERENCE", "SCHOLARSHIP"]),
  location: z.string().min(1),
  mode: z.enum(["ONLINE", "OFFLINE", "HYBRID"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  registrationDeadline: z.string().datetime(),
  organizer: z.string().min(1),
  eligibility: z.string().min(1),
  skills: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  registrationUrl: z.string().url(),
  relevanceScore: z.number().int().min(0).max(100).default(70),
  featured: z.boolean().default(false),
  isFree: z.boolean().optional(),
});

// ── Controllers ────────────────────────────────────────────────────────────────

/**
 * GET /api/opportunities
 * Supports: search, category, location, mode, eligibility, date, featured, page, limit, sort
 */
export const listOpportunities = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        status: "error",
        message: "Invalid query parameters",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const userId = (req as AuthRequest).user?.userId;
    const filters: OpportunityFilters = { ...parsed.data, userId };
    const result = await getOpportunities(filters);

    // Log search/filter usage (fire and forget) — whenever any search text
    // OR structured filter was used, not just free-text search. This is
    // what powers "most searched categories/locations" in admin analytics.
    const usedAnyFilter =
      filters.search || filters.category || filters.location || filters.mode ||
      filters.eligibility || filters.date || filters.domain || filters.registration;
    if (usedAnyFilter) {
      logSearchInteraction({
        userId,
        query: filters.search ?? "",
        category: filters.category ? parseCategoryEnum(filters.category.split(",")[0]) : undefined,
        location: filters.location ? filters.location.split(",")[0].trim() : undefined,
        resultsCount: result.total,
      }).catch(() => {/* non-critical */});
    }

    res.json({
      status: "success",
      data: result.data,
      // Per-opportunity AI Match scores, present only when sort=ai_match
      // and the request was authenticated.
      matchScores: result.matchScores ?? undefined,
      meta: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        filters: {
          search: filters.search,
          category: filters.category,
          location: filters.location,
          mode: filters.mode,
          eligibility: filters.eligibility,
          date: filters.date,
          domain: filters.domain,
          registration: filters.registration,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/opportunities/:id
 */
export const getOpportunity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      res.status(400).json({ status: "error", message: "Invalid opportunity ID" });
      return;
    }

    const opportunity = await getOpportunityById(id);

    if (!opportunity) {
      res.status(404).json({
        status: "error",
        message: `Opportunity with ID '${id}' not found`,
      });
      return;
    }

    res.json({ status: "success", data: opportunity });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/opportunities
 * Development-only; guarded by NODE_ENV check.
 */
export const addOpportunity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (process.env.NODE_ENV === "production") {
      res.status(403).json({ status: "error", message: "Forbidden in production" });
      return;
    }

    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const data = parsed.data;
    const opportunity = await createOpportunity({
      ...data,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      registrationDeadline: new Date(data.registrationDeadline),
    });

    res.status(201).json({ status: "success", data: opportunity });
  } catch (err) {
    next(err);
  }
};
