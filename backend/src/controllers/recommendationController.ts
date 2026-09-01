import { Request, Response, NextFunction } from "express";
import { generateRecommendations, getOpportunityMatch } from "../services/recommendationService";
import { AuthRequest } from "../middleware/authenticate";

/**
 * GET /api/recommendations
 * Returns personalised opportunity recommendations for the logged-in user.
 */
export const listRecommendations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = (req as AuthRequest).user!;
    const limit = Math.min(parseInt(String(req.query.limit ?? "12"), 10) || 12, 30);

    const recommendations = await generateRecommendations(userId, limit);

    res.json({
      status: "success",
      data: {
        recommendations: recommendations.map((r) => ({
          opportunity: serializeOpportunity(r.opportunity),
          score: Math.min(Math.max(r.score, 0), 100), // always clamp 0-100
          reason: r.reason,
          breakdown: serializeBreakdown(r.breakdown),
          matchedFactors: r.matchedFactors,
        })),
        total: recommendations.length,
        meta: {
          scoringVersion: "v2",
          weights: {
            interest: 25, category: 20, eligibility: 20,
            location: 15, skill: 10, mode: 5, deadline: 5,
          },
          note: "AI Match is based on your interests, eligibility, location, skills and opportunity preferences. Scores are indicative, not scientifically validated.",
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/recommendations/:opportunityId
 * Returns the match score for a specific opportunity for the logged-in user.
 * Used by the opportunity details page to show "Why this matches you".
 */
export const getMatch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = (req as AuthRequest).user!;
    const { opportunityId } = req.params;

    const match = await getOpportunityMatch(userId, opportunityId);

    if (!match) {
      res.status(404).json({
        status: "error",
        message: "Opportunity not found",
      });
      return;
    }

    res.json({
      status: "success",
      data: {
        opportunity: serializeOpportunity(match.opportunity),
        score: match.score,
        reason: match.reason,
        breakdown: match.breakdown,
        matchedFactors: match.matchedFactors,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Serialiser ─────────────────────────────────────────────────────────────────

function serializeOpportunity(opp: any) {
  return {
    id: opp.id,
    title: opp.title,
    description: opp.description,
    category: opp.category,
    location: opp.location,
    mode: opp.mode,
    startDate: opp.startDate instanceof Date ? opp.startDate.toISOString() : opp.startDate,
    endDate: opp.endDate instanceof Date ? opp.endDate.toISOString() : (opp.endDate ?? null),
    registrationDeadline:
      opp.registrationDeadline instanceof Date
        ? opp.registrationDeadline.toISOString()
        : opp.registrationDeadline,
    organizer: opp.organizer,
    eligibility: opp.eligibility,
    skills: opp.skills,
    tags: opp.tags,
    registrationUrl: opp.registrationUrl,
    relevanceScore: opp.relevanceScore,
    featured: opp.featured,
    source: opp.source ?? null,   // null for manual/seeded, "brabble" for external
  };
}

function serializeBreakdown(breakdown: any) {
  return {
    interest:    breakdown.interest    ?? 0,
    category:    breakdown.category    ?? 0,
    eligibility: breakdown.eligibility ?? 0,
    location:    breakdown.location    ?? 0,
    skill:       breakdown.skill       ?? 0,
    mode:        breakdown.mode        ?? 0,
    deadline:    breakdown.deadline    ?? 0,
    total:       breakdown.total       ?? 0,
  };
}
