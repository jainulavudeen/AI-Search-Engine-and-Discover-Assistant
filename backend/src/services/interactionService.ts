/**
 * interactionService.ts — Phase 16 activity tracking.
 *
 * Deliberately minimal: one append-only table (OpportunityInteraction) plus
 * two denormalized columns on the existing SearchInteraction model. No
 * per-user activity feed is exposed to anyone but that same user — admin
 * reads are aggregate-only (counts / groupBy), never a list of "who did
 * what". See adminController.getAnalytics for the admin-facing surface.
 */

import { InteractionType, Category } from "@prisma/client";
import prisma from "../lib/prisma";

// ── Write path ─────────────────────────────────────────────────────────────────

/**
 * Records one interaction. Never throws — tracking must never break the
 * student's actual action (viewing a page, clicking register, bookmarking).
 * Callers fire this without awaiting when it's not on the critical path.
 */
export async function logInteraction(params: {
  userId?: string | null;
  opportunityId: string;
  type: InteractionType;
}): Promise<void> {
  try {
    await prisma.opportunityInteraction.create({
      data: {
        opportunityId: params.opportunityId,
        type: params.type,
        ...(params.userId ? { userId: params.userId } : {}),
      },
    });
  } catch (err) {
    console.warn("[interactionService] Failed to log interaction:", err instanceof Error ? err.message : err);
  }
}

// ── Student-facing: own history only ──────────────────────────────────────────

/**
 * A student's own recently viewed opportunities, most recent first, deduped
 * by opportunity. Never accepts a userId from the caller other than the
 * authenticated request's own id — enforced by the controller, not here.
 */
export async function getRecentViews(userId: string, limit = 6) {
  const rows = await prisma.opportunityInteraction.findMany({
    where: { userId, type: InteractionType.VIEW, opportunity: { isActive: true } },
    orderBy: { createdAt: "desc" },
    take: limit * 3, // over-fetch to dedupe by opportunity below
    include: { opportunity: true },
  });

  const seen = new Set<string>();
  const deduped = [];
  for (const row of rows) {
    if (seen.has(row.opportunityId)) continue;
    seen.add(row.opportunityId);
    deduped.push(row.opportunity);
    if (deduped.length >= limit) break;
  }
  return deduped;
}

// ── Admin-facing: aggregate only ──────────────────────────────────────────────

export interface InteractionCounts {
  totalSearches: number;
  totalViews: number;
  totalBookmarks: number;
  totalRegisterClicks: number;
  totalRecommendationClicks: number;
}

export async function getInteractionCounts(): Promise<InteractionCounts> {
  const [totalSearches, totalViews, totalBookmarks, totalRegisterClicks, totalRecommendationClicks] = await Promise.all([
    prisma.searchInteraction.count(),
    prisma.opportunityInteraction.count({ where: { type: InteractionType.VIEW } }),
    prisma.opportunityInteraction.count({ where: { type: InteractionType.BOOKMARK } }),
    prisma.opportunityInteraction.count({ where: { type: InteractionType.REGISTER_CLICK } }),
    prisma.opportunityInteraction.count({ where: { type: InteractionType.RECOMMENDATION_CLICK } }),
  ]);
  return { totalSearches, totalViews, totalBookmarks, totalRegisterClicks, totalRecommendationClicks };
}

export interface CategoryCount {
  category: Category;
  count: number;
}

export interface LocationCount {
  location: string;
  count: number;
}

/** Most searched/filtered categories and locations — aggregate counts only. */
export async function getMostSearched(limit = 5): Promise<{ categories: CategoryCount[]; locations: LocationCount[] }> {
  const [categoryGroups, locationGroups] = await Promise.all([
    prisma.searchInteraction.groupBy({
      by: ["category"],
      where: { category: { not: null } },
      _count: { category: true },
      orderBy: { _count: { category: "desc" } },
      take: limit,
    }),
    prisma.searchInteraction.groupBy({
      by: ["location"],
      where: { location: { not: null } },
      _count: { location: true },
      orderBy: { _count: { location: "desc" } },
      take: limit,
    }),
  ]);

  return {
    categories: categoryGroups.map((g) => ({ category: g.category as Category, count: g._count.category })),
    locations: locationGroups.map((g) => ({ location: g.location as string, count: g._count.location })),
  };
}

export interface PopularOpportunity {
  id: string;
  title: string;
  category: Category;
  viewCount: number;
}

/** Most-viewed opportunities — opportunity-centric aggregate, no viewer identities. */
export async function getMostPopularOpportunities(limit = 5): Promise<PopularOpportunity[]> {
  const groups = await prisma.opportunityInteraction.groupBy({
    by: ["opportunityId"],
    where: { type: InteractionType.VIEW },
    _count: { opportunityId: true },
    orderBy: { _count: { opportunityId: "desc" } },
    take: limit,
  });

  if (groups.length === 0) return [];

  const opportunities = await prisma.opportunity.findMany({
    where: { id: { in: groups.map((g) => g.opportunityId) } },
    select: { id: true, title: true, category: true },
  });
  const byId = new Map(opportunities.map((o) => [o.id, o]));

  return groups
    .map((g) => {
      const opp = byId.get(g.opportunityId);
      if (!opp) return null;
      return { id: opp.id, title: opp.title, category: opp.category, viewCount: g._count.opportunityId };
    })
    .filter((x): x is PopularOpportunity => x !== null);
}
