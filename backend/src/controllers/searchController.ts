import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { aiSearch } from "../services/aiSearchService";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/authenticate";

// Explicit, user-selected filters from the /discover sidebar. Optional — a
// plain natural-language search with no filters selected omits this entirely.
// Takes priority over whatever the LLM infers from the query (see
// aiSearchService.mergeIntentWithFilters).
const explicitFiltersSchema = z
  .object({
    // Single value or comma-separated list (sidebar multi-select) — see the
    // matching comment in opportunityController.ts's listQuerySchema.
    category: z.string().max(200).optional(),
    location: z.string().max(200).optional(),
    mode: z.string().max(100).optional(),
    eligibility: z.string().max(200).optional(),
    date: z.enum(["today", "week", "month", "next_month", "upcoming"]).optional(),
    domain: z
      .enum(["AI", "Machine Learning", "Web Development", "Cloud", "Cybersecurity", "Data Science", "IoT", "Other"])
      .optional(),
    registration: z.enum(["free", "paid"]).optional(),
  })
  .optional();

const searchBodySchema = z.object({
  query: z
    .string({ required_error: "query is required" })
    .min(1, "Query cannot be empty")
    .max(500, "Query must be under 500 characters")
    .trim(),
  filters: explicitFiltersSchema,
});

/**
 * POST /api/search
 * Body: { query: string }
 */
export const handleSearch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = searchBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: "error",
        message: "Invalid request",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { query, filters } = parsed.data;
    const userId = (req as AuthRequest).user?.userId ?? null;

    // Run AI search with optional personalization (handles Gemini + fallback internally)
    // When userId is present (logged-in student), results are blended 70% search + 30% profile
    // Explicit sidebar filters (if any) take priority over the LLM's guess
    const result = await aiSearch(query, userId, filters);

    // Persist search interaction for analytics — non-blocking. category/
    // location come from the *effective* intent (post explicit-filter
    // override, see aiSearchService.mergeIntentWithFilters) so "most
    // searched categories/locations" reflects what was actually applied.
    prisma.searchInteraction
      .create({
        data: {
          userId,
          query,
          interpretedIntent: result.intent as object,
          category: result.intent.category ?? undefined,
          location: result.intent.location ?? undefined,
          resultsCount: result.totalCount,
        },
      })
      .catch((err: Error) =>
        console.warn("[SearchController] Could not save SearchInteraction:", err.message)
      );

    res.json({
      status: "success",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
