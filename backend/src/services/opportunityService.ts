import { Prisma, Category, Mode, Opportunity } from "@prisma/client";
import prisma from "../lib/prisma";
import { INTEREST_EXPANSION, rankOpportunitiesForUser } from "./recommendationService";

// ── Query param types ──────────────────────────────────────────────────────────

export type SortOption = "relevant" | "deadline" | "newest" | "ai_match";

/**
 * Structured filter fields shared by plain browse (/api/opportunities) and
 * AI search (/api/search). Kept in one place — buildOpportunityWhere() below
 * — so both callers filter Postgres identically instead of duplicating logic.
 */
export interface StructuredFilters {
  category?: string;   // "hackathon" | "internship" | ... (case-insensitive)
  location?: string;
  mode?: string;        // "online" | "offline" | "hybrid"
  eligibility?: string; // "Engineering Students" | "Undergraduate" | "Postgraduate" | "All Students" | free text
  date?: string;         // "today" | "week" | "month" | "next_month" | "upcoming"
  domain?: string;       // "AI" | "Machine Learning" | "Web Development" | "Cloud" | "Cybersecurity" | "Data Science" | "IoT" | "Other"
  registration?: string; // "free" | "paid"
  featured?: boolean;
}

export interface OpportunityFilters extends StructuredFilters {
  search?: string;
  page?: number;
  limit?: number;
  sort?: SortOption;
  /** Logged-in student's id — required only for sort="ai_match" personalization */
  userId?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// Hard cap on candidates fetched from Postgres for in-memory AI-match scoring.
// Recommendation scoring is cheap/deterministic (no LLM calls), but we still
// bound it — mirrors the existing `take: 50` cap in aiSearchService.
const AI_MATCH_CANDIDATE_CAP = 300;

// ── Helpers ────────────────────────────────────────────────────────────────────

export function parseDateFilter(date: string): Prisma.DateTimeFilter | undefined {
  const now = new Date();
  const endOf = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  };

  switch (date) {
    case "today":
      return { gte: now, lte: endOf(1) };
    case "week":
      return { gte: now, lte: endOf(7) };
    case "month":
      return { gte: now, lte: endOf(30) };
    case "next_month": {
      const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      return { gte: start, lte: end };
    }
    case "upcoming":
      return { gte: now };
    default:
      return undefined;
  }
}

export function parseCategoryEnum(cat: string): Category | undefined {
  const map: Record<string, Category> = {
    hackathon: Category.HACKATHON,
    internship: Category.INTERNSHIP,
    workshop: Category.WORKSHOP,
    competition: Category.COMPETITION,
    conference: Category.CONFERENCE,
    scholarship: Category.SCHOLARSHIP,
  };
  return map[cat.toLowerCase()];
}

export function parseModeEnum(mode: string): Mode | undefined {
  const map: Record<string, Mode> = {
    online: Mode.ONLINE,
    offline: Mode.OFFLINE,
    hybrid: Mode.HYBRID,
  };
  return map[mode.toLowerCase()];
}

// Filter-panel eligibility buckets → matching keywords in the free-text
// `eligibility` field. Distinct from recommendationService's course/year
// keyword tables — this is a hard filter, not a score weight.
const ELIGIBILITY_BUCKET_KEYWORDS: Record<string, string[]> = {
  "engineering students": ["engineering", "b.tech", "btech", "b.e", "cse", "ece", "mechanical", "civil", "electrical"],
  "undergraduate": ["undergraduate", "ug", "b.tech", "btech", "bachelor"],
  "postgraduate": ["postgraduate", "pg", "masters", "m.tech", "mtech", "mca", "mba"],
  "all students": ["all students", "all years", "open to all", "everyone"],
};

// "Domain" filter options → reuse the same interest→keyword expansion table
// the recommendation engine already uses, so search/filter/scoring never drift.
const DOMAIN_FILTER_LABELS: Record<string, string> = {
  ai: "Artificial Intelligence",
  "machine learning": "Machine Learning",
  "web development": "Web Development",
  cloud: "Cloud Computing",
  cybersecurity: "Cybersecurity",
  "data science": "Data Science",
  iot: "IoT",
};

function domainKeywords(domain: string): string[] | null {
  const key = DOMAIN_FILTER_LABELS[domain.toLowerCase()];
  if (!key) return null; // "Other" or unrecognized — no additional constraint
  return INTEREST_EXPANSION[key] ?? null;
}

// "ai" -> ["ai", "AI", "Ai"], "machine learning" -> ["machine learning", "MACHINE LEARNING", "Machine Learning"]
function caseVariants(kw: string): string[] {
  const titleCase = kw.replace(/\b\w/g, (c) => c.toUpperCase());
  return Array.from(new Set([kw, kw.toUpperCase(), titleCase]));
}

/**
 * Builds the shared Postgres WHERE clause for structured filters. Used by
 * both plain browse (getOpportunities) and AI search (aiSearchService), so
 * "Category = Hackathon AND Location = Chennai AND ..." filters combine
 * identically regardless of which endpoint applied them.
 */
// Splits a comma-separated filter value into individual tokens. The sidebar
// supports multi-select checkboxes for category/location/mode/eligibility
// (e.g. "Hackathon,Internship") — a single value is just a 1-element list.
function splitMulti(value: string): string[] {
  return value.split(",").map((v) => v.trim()).filter(Boolean);
}

function eligibilityCondition(term: string): Prisma.OpportunityWhereInput {
  const bucket = ELIGIBILITY_BUCKET_KEYWORDS[term.toLowerCase()];
  if (bucket) {
    return { OR: bucket.map((kw) => ({ eligibility: { contains: kw, mode: "insensitive" as const } })) };
  }
  // Free-text eligibility (not one of the four buckets) — plain contains match
  return { eligibility: { contains: term, mode: "insensitive" } };
}

export function buildOpportunityWhere(filters: StructuredFilters): Prisma.OpportunityWhereInput {
  const AND: Prisma.OpportunityWhereInput[] = [];

  if (filters.category) {
    const parsed = splitMulti(filters.category).map(parseCategoryEnum).filter((c): c is Category => !!c);
    if (parsed.length === 1) AND.push({ category: parsed[0] });
    else if (parsed.length > 1) AND.push({ category: { in: parsed } });
  }

  if (filters.location) {
    const locations = splitMulti(filters.location);
    if (locations.length === 1) {
      AND.push({ location: { contains: locations[0], mode: "insensitive" } });
    } else if (locations.length > 1) {
      AND.push({ OR: locations.map((loc) => ({ location: { contains: loc, mode: "insensitive" as const } })) });
    }
  }

  if (filters.mode) {
    const parsed = splitMulti(filters.mode).map(parseModeEnum).filter((m): m is Mode => !!m);
    if (parsed.length === 1) AND.push({ mode: parsed[0] });
    else if (parsed.length > 1) AND.push({ mode: { in: parsed } });
  }

  if (filters.eligibility) {
    const terms = splitMulti(filters.eligibility);
    if (terms.length === 1) AND.push(eligibilityCondition(terms[0]));
    else if (terms.length > 1) AND.push({ OR: terms.map(eligibilityCondition) });
  }

  if (filters.date) {
    const dateFilter = parseDateFilter(filters.date);
    if (dateFilter) AND.push({ startDate: dateFilter });
  }

  if (filters.domain) {
    const keywords = domainKeywords(filters.domain);
    if (keywords) {
      const conditions: Prisma.OpportunityWhereInput[] = [];
      for (const kw of keywords) {
        // Short keywords (e.g. "ai") as a free-text substring match false-
        // positive against unrelated words ("AICTE", "maintain") — only use
        // them for exact skills/tags matching, not title/description search.
        if (kw.length > 3) {
          conditions.push(
            { title: { contains: kw, mode: "insensitive" } },
            { description: { contains: kw, mode: "insensitive" } }
          );
        }
        // Prisma's array `has` is case-sensitive; skills/tags are stored in
        // Title Case ("AI", "Machine Learning") while INTEREST_EXPANSION
        // keywords are lowercase — check the casings actually seen in data.
        for (const variant of caseVariants(kw)) {
          conditions.push({ skills: { has: variant } }, { tags: { has: variant } });
        }
      }
      AND.push({ OR: conditions });
    }
  }

  if (filters.registration) {
    const r = filters.registration.toLowerCase();
    if (r === "free") AND.push({ isFree: true });
    else if (r === "paid") AND.push({ isFree: false });
  }

  if (filters.featured !== undefined) {
    AND.push({ featured: filters.featured });
  }

  return AND.length > 0 ? { AND } : {};
}

// ── Service methods ────────────────────────────────────────────────────────────

export async function getOpportunities(
  filters: OpportunityFilters
): Promise<PaginatedResult<Opportunity> & { matchScores?: Record<string, number> }> {
  const {
    search,
    page = 1,
    limit = 20,
    sort = "relevant",
    userId,
  } = filters;

  const structuredWhere = buildOpportunityWhere(filters);
  // Students never see admin-deactivated opportunities (soft-closed, not
  // deleted — see Opportunity.isActive / adminController.setOpportunityStatus).
  const AND: Prisma.OpportunityWhereInput[] = [structuredWhere, { isActive: true }];
  if (search) {
    AND.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { organizer: { contains: search, mode: "insensitive" } },
        { eligibility: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ],
    });
  }
  const where: Prisma.OpportunityWhereInput = { AND };

  // "Highest AI Match" needs application-side scoring (recommendationService),
  // which can't be expressed as a Postgres ORDER BY — fetch a bounded, already
  // db-filtered candidate set, score+sort in memory, then paginate that.
  if (sort === "ai_match" && userId) {
    // AI Match always excludes expired opportunities (matches the behavior
    // of GET /api/recommendations) — fold that into `where` for both queries
    // so `total` accurately reflects the actual rankable candidate pool.
    const aiMatchWhere: Prisma.OpportunityWhereInput = {
      AND: [where, { registrationDeadline: { gte: new Date() } }],
    };

    const [candidates, total] = await Promise.all([
      prisma.opportunity.findMany({
        where: aiMatchWhere,
        orderBy: { relevanceScore: "desc" },
        take: AI_MATCH_CANDIDATE_CAP,
      }),
      prisma.opportunity.count({ where: aiMatchWhere }),
    ]);

    const ranked = await rankOpportunitiesForUser(userId, candidates);
    const skip = (page - 1) * limit;
    const pageSlice = ranked.slice(skip, skip + limit);

    return {
      data: pageSlice.map((r) => r.opportunity),
      matchScores: Object.fromEntries(pageSlice.map((r) => [r.opportunity.id, r.score])),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Sort — DB-level ordering for all non-personalized sort options
  const orderBy: Prisma.OpportunityOrderByWithRelationInput =
    sort === "deadline"
      ? { registrationDeadline: "asc" }
      : sort === "newest"
      ? { createdAt: "desc" }
      : { relevanceScore: "desc" }; // "relevant" (also the fallback when ai_match has no userId)

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.opportunity.findMany({ where, orderBy, skip, take: limit }),
    prisma.opportunity.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getOpportunityById(id: string) {
  return prisma.opportunity.findUnique({ where: { id } });
}

export async function createOpportunity(
  data: Prisma.OpportunityCreateInput
) {
  return prisma.opportunity.create({ data });
}

export async function logSearchInteraction(params: {
  userId?: string;
  query: string;
  interpretedIntent?: Record<string, unknown>;
  category?: Category;
  location?: string;
  resultsCount: number;
}) {
  // Use unchecked input so userId scalar can be passed directly
  const { userId, ...rest } = params;
  return prisma.searchInteraction.create({
    data: {
      ...rest,
      ...(userId ? { userId } : {}),
    } as Prisma.SearchInteractionUncheckedCreateInput,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN OPPORTUNITY MANAGEMENT (Phase 15)
// Unlike getOpportunities() above, these intentionally do NOT filter by
// isActive/expiry — an admin needs to see and manage every record, including
// closed and expired ones. Gated by requireAdmin at the route level.
// ══════════════════════════════════════════════════════════════════════════════

export type OpportunityStatus = "LIVE" | "CLOSED" | "EXPIRED";

/** LIVE = active and not yet past deadline. EXPIRED = deadline passed but not
 *  admin-closed. CLOSED = admin deactivated it (see isActive). */
export function computeOpportunityStatus(opp: {
  isActive: boolean;
  registrationDeadline: Date;
}): OpportunityStatus {
  if (!opp.isActive) return "CLOSED";
  if (opp.registrationDeadline.getTime() < Date.now()) return "EXPIRED";
  return "LIVE";
}

export interface AdminOpportunityFilters {
  search?: string;         // matches title, organizer, location, source, or category
  status?: "live" | "closed" | "expired";
  source?: "manual" | "external";
  category?: string;
  page?: number;
  limit?: number;
}

export async function getAdminOpportunities(
  filters: AdminOpportunityFilters
): Promise<PaginatedResult<Opportunity>> {
  const { search, status, source, category, page = 1, limit = 20 } = filters;
  const now = new Date();
  const AND: Prisma.OpportunityWhereInput[] = [];

  if (search) {
    const searchOr: Prisma.OpportunityWhereInput[] = [
      { title: { contains: search, mode: "insensitive" } },
      { organizer: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
      { source: { contains: search, mode: "insensitive" } },
    ];
    const categoryMatch = parseCategoryEnum(search);
    if (categoryMatch) searchOr.push({ category: categoryMatch });
    AND.push({ OR: searchOr });
  }

  if (category) {
    const parsed = parseCategoryEnum(category);
    if (parsed) AND.push({ category: parsed });
  }

  if (source === "manual") AND.push({ source: null });
  else if (source === "external") AND.push({ source: { not: null } });

  if (status === "closed") AND.push({ isActive: false });
  else if (status === "expired") AND.push({ isActive: true, registrationDeadline: { lt: now } });
  else if (status === "live") AND.push({ isActive: true, registrationDeadline: { gte: now } });

  const where: Prisma.OpportunityWhereInput = AND.length > 0 ? { AND } : {};
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.opportunity.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.opportunity.count({ where }),
  ]);

  return { data, total, page, totalPages: Math.ceil(total / limit) };
}

export interface OpportunityStats {
  total: number;
  active: number;
  expired: number;
  closed: number;
  external: number;
  manual: number;
}

export async function getOpportunityStats(): Promise<OpportunityStats> {
  const now = new Date();
  const [total, active, expired, closed, external, manual] = await Promise.all([
    prisma.opportunity.count(),
    prisma.opportunity.count({ where: { isActive: true, registrationDeadline: { gte: now } } }),
    prisma.opportunity.count({ where: { isActive: true, registrationDeadline: { lt: now } } }),
    prisma.opportunity.count({ where: { isActive: false } }),
    prisma.opportunity.count({ where: { source: { not: null } } }),
    prisma.opportunity.count({ where: { source: null } }),
  ]);
  return { total, active, expired, closed, external, manual };
}

// Fields an admin may edit. Deliberately excludes source/sourceId/
// externalUpdatedAt (external-sync-owned) and isActive (use
// setOpportunityStatus, which is a distinct, audited action).
export interface AdminOpportunityUpdate {
  title?: string;
  description?: string;
  category?: Category;
  location?: string;
  mode?: Mode;
  startDate?: Date;
  endDate?: Date | null;
  registrationDeadline?: Date;
  organizer?: string;
  eligibility?: string;
  skills?: string[];
  tags?: string[];
  registrationUrl?: string;
  relevanceScore?: number;
  featured?: boolean;
  isFree?: boolean | null;
}

export async function updateOpportunity(id: string, data: AdminOpportunityUpdate) {
  return prisma.opportunity.update({ where: { id }, data });
}

export async function setOpportunityStatus(id: string, isActive: boolean) {
  return prisma.opportunity.update({ where: { id }, data: { isActive } });
}
