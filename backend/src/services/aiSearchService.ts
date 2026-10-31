/**
 * AI Search Service
 *
 * Architecture:
 * 1. Try Gemini Flash to extract structured SearchIntent from natural language
 * 2. Fallback to rule-based extraction if no API key or Gemini fails
 * 3. Backend converts SearchIntent → safe Prisma queries (AI never touches SQL)
 * 4. Hybrid retrieval: keyword matches ∪ semantic matches from a local
 *    transformer embedding model (see embeddingService), scored as a
 *    weighted blend of semantic similarity and keyword relevance
 * 5. Second stage: a local cross-encoder re-scores the shortlist by reading
 *    query + opportunity together (see rerankerService)
 * 6. Results are ranked; if userId is provided, personalization is blended in
 *
 * LLM is used ONLY for:
 *   a) Natural-language → structured SearchIntent extraction (1 call per search)
 * LLM is NOT used for:
 *   - SQL generation (never)
 *   - Scoring individual opportunities (never)
 *   - Fetching data from PostgreSQL (never)
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../lib/prisma";
import type {
  SearchIntent,
  SearchCategory,
  SearchTimeRange,
  SearchResult,
  SearchResponse,
} from "../types/search";
import { Prisma } from "@prisma/client";
import { personalizeSearchResults } from "./recommendationService";
import { semanticSearch } from "./embeddingService";
import { rerankPassage, rerankScores } from "./rerankerService";
import {
  buildOpportunityWhere,
  parseCategoryEnum,
  parseModeEnum,
  parseDateFilter,
  type StructuredFilters,
} from "./opportunityService";

// ══════════════════════════════════════════════════════════════════════════════
// RULE-BASED FALLBACK EXTRACTION
// ══════════════════════════════════════════════════════════════════════════════

const CATEGORY_MAP: Array<[string, SearchCategory]> = [
  ["hackathon", "HACKATHON"],
  ["hack", "HACKATHON"],
  ["internship", "INTERNSHIP"],
  ["intern", "INTERNSHIP"],
  ["workshop", "WORKSHOP"],
  ["competition", "COMPETITION"],
  ["compete", "COMPETITION"],
  ["olympiad", "COMPETITION"],
  ["conference", "CONFERENCE"],
  ["summit", "CONFERENCE"],
  ["scholarship", "SCHOLARSHIP"],
  ["fellowship", "SCHOLARSHIP"],
  ["grant", "SCHOLARSHIP"],
];

const KNOWN_LOCATIONS = [
  "Chennai",
  "Bangalore",
  "Bengaluru",
  "Hyderabad",
  "Mumbai",
  "Delhi",
  "New Delhi",
  "Pune",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Kochi",
  "Coimbatore",
  "Noida",
  "Gurgaon",
  "Online",
  "Remote",
  "Virtual",
];

const SKILL_KEYWORDS = [
  "artificial intelligence",
  "machine learning",
  "deep learning",
  "natural language processing",
  "nlp",
  "computer vision",
  "web development",
  "frontend",
  "backend",
  "fullstack",
  "full stack",
  "cloud computing",
  "aws",
  "azure",
  "gcp",
  "google cloud",
  "cybersecurity",
  "security",
  "mobile development",
  "android",
  "ios",
  "flutter",
  "data science",
  "data analytics",
  "blockchain",
  "iot",
  "internet of things",
  "robotics",
  "python",
  "java",
  "javascript",
  "typescript",
  "golang",
  "rust",
  "ai",
  "ml",
];

const STUDENT_TYPE_MAP: Array<[string, string]> = [
  ["computer science", "Computer Science"],
  ["information technology", "Information Technology"],
  ["engineering", "Engineering"],
  ["mechanical", "Mechanical Engineering"],
  ["civil", "Civil Engineering"],
  ["electronics", "Electronics"],
  ["electrical", "Electrical Engineering"],
  ["btech", "Engineering"],
  ["b.tech", "Engineering"],
  ["b.e", "Engineering"],
  ["postgraduate", "Postgraduate"],
  ["postgrad", "Postgraduate"],
  ["undergraduate", "Undergraduate"],
  ["undergrad", "Undergraduate"],
  ["cs student", "Computer Science"],
  ["it student", "Information Technology"],
];

export function ruleBasedExtract(query: string): SearchIntent {
  const q = query.toLowerCase();

  // Category
  let category: SearchCategory | null = null;
  for (const [kw, cat] of CATEGORY_MAP) {
    if (q.includes(kw)) {
      category = cat;
      break;
    }
  }

  // Location
  let location: string | null = null;
  for (const city of KNOWN_LOCATIONS) {
    if (q.includes(city.toLowerCase())) {
      location = city;
      break;
    }
  }

  // Mode
  let mode: "ONLINE" | "OFFLINE" | "HYBRID" | null = null;
  if (q.match(/\b(online|virtual|remote)\b/)) mode = "ONLINE";
  else if (q.match(/\b(offline|in-person|onsite|on-site|physical)\b/)) mode = "OFFLINE";

  // Time range
  let timeRange: SearchTimeRange | null = null;
  if (q.match(/\bthis week\b|\bnext week\b/)) timeRange = "this_week";
  else if (q.match(/\bthis month\b/)) timeRange = "this_month";
  else if (q.match(/\bnext month\b/)) timeRange = "next_month";
  else if (q.match(/\bthis year\b/)) timeRange = "this_year";

  // Skills
  const skills: string[] = [];
  for (const skill of SKILL_KEYWORDS) {
    if (q.includes(skill)) {
      // Normalise common abbreviations
      const normalised =
        skill === "ai"
          ? "Artificial Intelligence"
          : skill === "ml"
          ? "Machine Learning"
          : skill === "nlp"
          ? "Natural Language Processing"
          : skill.charAt(0).toUpperCase() + skill.slice(1);
      if (!skills.includes(normalised)) skills.push(normalised);
    }
  }

  // Keywords (content words > 3 chars that aren't stop words)
  const STOP = new Set([
    "find","show","search","get","want","need","look","looking","for","the",
    "and","with","near","this","that","from","some","any","all","give","list",
    "students","student","based","month","week","year","please","about",
  ]);
  const keywords = q
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z]/g, ""))
    .filter((w) => w.length > 3 && !STOP.has(w))
    .slice(0, 8);

  // Student type
  let studentType: string | null = null;
  for (const [kw, type] of STUDENT_TYPE_MAP) {
    if (q.includes(kw)) {
      studentType = type;
      break;
    }
  }

  // Deadline preference
  let deadlinePreference: "urgent" | "flexible" | null = null;
  if (q.match(/\b(urgent|soon|quickly|deadline|asap|fast|upcoming)\b/))
    deadlinePreference = "urgent";

  return {
    category,
    keywords,
    location,
    mode,
    studentType,
    timeRange,
    skills,
    deadlinePreference,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// GEMINI AI EXTRACTION
// ══════════════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are an intent extraction API for a student opportunity search engine.

Your task: analyse a natural language query and extract structured search intent.

Return ONLY a valid JSON object with exactly this structure (no markdown, no explanation):
{
  "category": "HACKATHON" | "INTERNSHIP" | "WORKSHOP" | "COMPETITION" | "CONFERENCE" | "SCHOLARSHIP" | null,
  "keywords": string[],
  "location": string | null,
  "mode": "ONLINE" | "OFFLINE" | "HYBRID" | null,
  "studentType": string | null,
  "timeRange": "this_week" | "this_month" | "next_month" | "this_year" | null,
  "skills": string[],
  "deadlinePreference": "urgent" | "flexible" | null
}

Rules:
- category: one of the enum values if mentioned, null otherwise
- keywords: 2–8 key concept words extracted from the query
- location: city/region name if mentioned, null otherwise
- mode: infer from "online"/"offline"/"virtual"/"in-person", null if not mentioned
- studentType: e.g. "Engineering", "Computer Science", null if not mentioned
- timeRange: interpret temporal phrases ("this month", "next week", etc.), null if not mentioned
- skills: specific technologies or domains (AI, ML, Cloud, Python, etc.)
- deadlinePreference: "urgent" if user wants soon deadlines, null otherwise
- NEVER include SQL, code, or extra text — JSON only`;

/**
 * Overridable via env because Google retires pinned model versions (e.g.
 * gemini-1.5-flash now 404s) — swapping models should be config, not code.
 */
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

/** A slow Gemini response falls back to rule-based extraction instead of stalling search */
const GEMINI_TIMEOUT_MS = 5000;

async function extractWithGemini(query: string): Promise<SearchIntent> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel(
    {
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.1, // low temperature for deterministic JSON
        maxOutputTokens: 512,
      },
    },
    { timeout: GEMINI_TIMEOUT_MS }
  );

  const prompt = `${SYSTEM_PROMPT}\n\nQuery: "${query}"`;
  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();

  // Strip markdown code fences if the model adds them
  const jsonStr = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Gemini returned non-JSON response: ${raw.slice(0, 200)}`);

  const parsed = JSON.parse(jsonMatch[0]);

  // Sanitise — ensure arrays, string fields, valid enums
  const validCategories = new Set([
    "HACKATHON","INTERNSHIP","WORKSHOP","COMPETITION","CONFERENCE","SCHOLARSHIP",
  ]);
  const validModes = new Set(["ONLINE", "OFFLINE", "HYBRID"]);
  const validTimeRanges = new Set(["this_week","this_month","next_month","this_year"]);

  return {
    category: validCategories.has(parsed.category) ? parsed.category : null,
    keywords: Array.isArray(parsed.keywords)
      ? parsed.keywords.filter((k: unknown) => typeof k === "string").slice(0, 10)
      : [],
    location: typeof parsed.location === "string" ? parsed.location : null,
    mode: validModes.has(parsed.mode) ? parsed.mode : null,
    studentType: typeof parsed.studentType === "string" ? parsed.studentType : null,
    timeRange: validTimeRanges.has(parsed.timeRange) ? parsed.timeRange : null,
    skills: Array.isArray(parsed.skills)
      ? parsed.skills.filter((s: unknown) => typeof s === "string").slice(0, 10)
      : [],
    deadlinePreference:
      parsed.deadlinePreference === "urgent" || parsed.deadlinePreference === "flexible"
        ? parsed.deadlinePreference
        : null,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// DATE RANGE BUILDER
// ══════════════════════════════════════════════════════════════════════════════

function buildDateRange(
  timeRange: SearchTimeRange
): { gte: Date; lte: Date } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (timeRange) {
    case "this_week":
      end.setDate(end.getDate() + 7);
      break;
    case "this_month":
      start.setDate(1);
      end.setMonth(end.getMonth() + 1, 0);
      break;
    case "next_month":
      start.setMonth(start.getMonth() + 1, 1);
      end.setMonth(end.getMonth() + 2, 0);
      break;
    case "this_year":
      end.setFullYear(end.getFullYear(), 11, 31);
      break;
  }

  return { gte: start, lte: end };
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPLICIT FILTER OVERRIDE  (for display — mirrors the precedence resolved
// inside executeSearch's WHERE builder below; kept in sync manually since
// one returns a Prisma clause and the other a SearchIntent for the UI)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Returns the *effective* intent after explicit user filters override the
 * LLM's guess — used for the response's `intent` field (search-page chips)
 * and the explanation text, so the UI never shows a stale LLM guess that the
 * user's own filter selection has already overridden.
 */
function mergeIntentWithFilters(
  intent: SearchIntent,
  explicit?: StructuredFilters
): SearchIntent {
  if (!explicit) return intent;
  const merged: SearchIntent = { ...intent };

  // Chips display a single value each — when multi-select is used, show the
  // first choice (the actual WHERE clause still applies all of them).
  if (explicit.category) {
    const enumVal = parseCategoryEnum(explicit.category.split(",")[0].trim());
    if (enumVal) merged.category = enumVal as SearchCategory;
  }
  if (explicit.mode) {
    const modeVal = explicit.mode.split(",")[0].trim().toUpperCase();
    if (modeVal === "ONLINE" || modeVal === "OFFLINE" || modeVal === "HYBRID") {
      merged.mode = modeVal;
    }
  }
  if (explicit.location) merged.location = explicit.location.split(",")[0].trim();
  if (explicit.eligibility) merged.studentType = explicit.eligibility.split(",")[0].trim();

  return merged;
}

// ══════════════════════════════════════════════════════════════════════════════
// SAFE PRISMA QUERY BUILDER  (AI never touches this — only structured intent)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Builds the Prisma WHERE clause from LLM/rule-based intent, then layers any
 * explicit user-selected filters on top. Per Phase 14 spec, explicit filters
 * take priority over the LLM's guess wherever both speak to the same field
 * (category, mode, date) — they REPLACE rather than combine with intent there.
 * Fields the LLM intent doesn't produce (domain, registration) and fields
 * explicit-only filtering hardens into an AND (location, eligibility) are
 * built once via the shared buildOpportunityWhere() so this never drifts
 * from plain browse (/api/opportunities) filtering.
 */
function buildSearchWhere(intent: SearchIntent, explicitFilters?: StructuredFilters) {
  const now = new Date();
  const AND: Prisma.OpportunityWhereInput[] = [];

  // Always exclude expired opportunities from search results unless explicitly
  // requested via deadlinePreference or a specific past time-range query.
  // This ensures users never see opportunities they can no longer register for.
  AND.push({ registrationDeadline: { gte: now } });

  // Admin-deactivated opportunities are never shown to students (soft-closed,
  // not deleted — see Opportunity.isActive).
  AND.push({ isActive: true });

  // Category/mode — an explicit filter (possibly multi-select, e.g.
  // "hackathon,internship") fully replaces the LLM's single guess. Built via
  // buildOpportunityWhere so multi-select is handled identically to browse.
  if (explicitFilters?.category) {
    const clause = buildOpportunityWhere({ category: explicitFilters.category });
    if (Array.isArray(clause.AND)) AND.push(...clause.AND);
  } else if (intent.category) {
    const categoryEnum = parseCategoryEnum(intent.category);
    if (categoryEnum) AND.push({ category: categoryEnum });
  }

  if (explicitFilters?.mode) {
    const clause = buildOpportunityWhere({ mode: explicitFilters.mode });
    if (Array.isArray(clause.AND)) AND.push(...clause.AND);
  } else if (intent.mode) {
    const modeEnum = parseModeEnum(intent.mode);
    if (modeEnum) AND.push({ mode: modeEnum });
  }

  // Date — an explicit date filter replaces the LLM's inferred time range
  if (explicitFilters?.date) {
    const dateFilter = parseDateFilter(explicitFilters.date);
    if (dateFilter) AND.push({ startDate: dateFilter });
  } else if (intent.timeRange) {
    const range = buildDateRange(intent.timeRange);
    AND.push({ startDate: { gte: range.gte, lte: range.lte } });
  }

  // Deadline urgency — deadline within 7 days (LLM-only signal)
  if (intent.deadlinePreference === "urgent") {
    const urgentDeadline = new Date();
    urgentDeadline.setDate(urgentDeadline.getDate() + 7);
    AND.push({ registrationDeadline: { lte: urgentDeadline } });
  }

  // Explicit-only hard filters with no LLM equivalent — reuse the same
  // builder plain browse uses so both endpoints filter identically.
  const explicitOnly = buildOpportunityWhere({
    location: explicitFilters?.location,
    eligibility: explicitFilters?.eligibility,
    domain: explicitFilters?.domain,
    registration: explicitFilters?.registration,
  });
  if (Array.isArray(explicitOnly.AND)) AND.push(...explicitOnly.AND);

  // Text search conditions (OR across relevant fields) — the LLM's soft,
  // recall-oriented signal. Kept even when an explicit filter hardened the
  // same field above; it only widens matches, never narrows them.
  const searchTerms = [
    ...new Set([...intent.keywords, ...intent.skills]),
  ].filter(Boolean);

  const textConditions: Prisma.OpportunityWhereInput[] = [];

  if (intent.location && !explicitFilters?.location) {
    textConditions.push({
      location: { contains: intent.location, mode: "insensitive" },
    });
  }

  if (intent.studentType) {
    textConditions.push({
      eligibility: { contains: intent.studentType, mode: "insensitive" },
    });
  }

  for (const term of searchTerms) {
    textConditions.push(
      { title: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { eligibility: { contains: term, mode: "insensitive" } }
    );
  }

  return {
    /** Hard filters only — the candidate pool for semantic retrieval */
    filterWhere: { AND } satisfies Prisma.OpportunityWhereInput,
    /** Hard filters + keyword OR — the classic keyword retrieval query */
    keywordWhere: {
      AND: [...AND, ...(textConditions.length > 0 ? [{ OR: textConditions }] : [])],
    } satisfies Prisma.OpportunityWhereInput,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// HYBRID RETRIEVAL (keyword ∪ semantic)
// ══════════════════════════════════════════════════════════════════════════════

/** Max results returned — leaves personalization a larger pool to re-rank */
const RESULT_LIMIT = 50;

/**
 * A semantic-only match (one the keyword query missed) is included when its
 * cosine similarity is ≥ SEMANTIC_MIN_SIMILARITY (MiniLM scores unrelated
 * text ~0.0–0.2) AND within SEMANTIC_RELATIVE_MARGIN of the best match — so a
 * query with strong matches doesn't get padded with loosely related ones.
 */
const SEMANTIC_MIN_SIMILARITY = 0.3;
const SEMANTIC_RELATIVE_MARGIN = 0.15;

/** Cosine similarity at or above which the semantic component scores 100 */
const SEMANTIC_FULL_SCORE_AT = 0.6;

/** Weight of semantic similarity vs keyword relevance in the hybrid score */
const SEMANTIC_WEIGHT = 0.6;

type OpportunityRow = Awaited<ReturnType<typeof prisma.opportunity.findMany>>[number];

interface RetrievalResult {
  rows: OpportunityRow[];
  /** opportunityId → cosine similarity; null when the embedding model is unavailable */
  similarity: Map<string, number> | null;
}

/**
 * Runs keyword retrieval and semantic retrieval over the same hard filters,
 * then unions them. Semantic retrieval surfaces opportunities that match the
 * query's meaning without sharing its words; if the model can't load, search
 * degrades to keyword-only rather than failing.
 */
async function executeSearch(
  query: string,
  intent: SearchIntent,
  explicitFilters: StructuredFilters | undefined,
  useSemantic: boolean
): Promise<RetrievalResult> {
  const { filterWhere, keywordWhere } = buildSearchWhere(intent, explicitFilters);

  const [keywordRows, semanticHits] = await Promise.all([
    prisma.opportunity.findMany({
      where: keywordWhere,
      orderBy: { relevanceScore: "desc" },
      take: RESULT_LIMIT,
    }),
    useSemantic
      ? semanticSearch(query, filterWhere).catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[AISearch] ⚡ Semantic search unavailable (${msg}), using keyword-only retrieval`);
          return null;
        })
      : null,
  ]);

  if (!semanticHits) return { rows: keywordRows, similarity: null };

  const similarity = new Map(semanticHits.map((h) => [h.id, h.similarity]));

  const keywordIds = new Set(keywordRows.map((r) => r.id));
  const cutoff = Math.max(
    SEMANTIC_MIN_SIMILARITY,
    (semanticHits[0]?.similarity ?? 0) - SEMANTIC_RELATIVE_MARGIN
  );
  const semanticOnlyIds = semanticHits
    .filter((h) => h.similarity >= cutoff && !keywordIds.has(h.id))
    .slice(0, RESULT_LIMIT)
    .map((h) => h.id);

  const semanticRows =
    semanticOnlyIds.length > 0
      ? await prisma.opportunity.findMany({ where: { id: { in: semanticOnlyIds } } })
      : [];

  console.log(
    `[AISearch] 🧠 Hybrid retrieval: ${keywordRows.length} keyword + ${semanticRows.length} semantic-only`
  );

  return { rows: [...keywordRows, ...semanticRows], similarity };
}

// ══════════════════════════════════════════════════════════════════════════════
// RESULT RANKING (client-facing boosting on top of DB order)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Scores each result 0–100. Keyword score = DB relevance + term/location
 * boosts. When semantic similarity is available the final score is a convex
 * blend: SEMANTIC_WEIGHT × semantic + (1 − SEMANTIC_WEIGHT) × keyword.
 */
function rankResults(
  results: OpportunityRow[],
  intent: SearchIntent,
  similarity: Map<string, number> | null = null
): SearchResult[] {
  return results
    .map((r) => {
      let boost = 0;
      const txt = [r.title, r.description, ...r.tags, ...r.skills]
        .join(" ")
        .toLowerCase();

      // Boost for each keyword/skill hit
      for (const term of [...intent.keywords, ...intent.skills]) {
        if (txt.includes(term.toLowerCase())) boost += 5;
      }

      // Boost for exact location match (vs partial)
      if (
        intent.location &&
        r.location.toLowerCase() === intent.location.toLowerCase()
      ) {
        boost += 12;
      }

      // Boost for featured
      if (r.featured) boost += 3;

      const keywordScore = Math.min(r.relevanceScore + boost, 100);
      const sim = similarity?.get(r.id);
      const searchScore =
        sim === undefined
          ? keywordScore
          : Math.round(
              SEMANTIC_WEIGHT * Math.min(Math.max(sim / SEMANTIC_FULL_SCORE_AT, 0), 1) * 100 +
                (1 - SEMANTIC_WEIGHT) * keywordScore
            );

      return {
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        location: r.location,
        mode: r.mode,
        startDate: r.startDate.toISOString(),
        endDate: r.endDate?.toISOString() ?? null,
        registrationDeadline: r.registrationDeadline.toISOString(),
        organizer: r.organizer,
        eligibility: r.eligibility,
        skills: r.skills,
        tags: r.tags,
        registrationUrl: r.registrationUrl,
        relevanceScore: r.relevanceScore,
        featured: r.featured,
        _searchScore: searchScore,
      } satisfies SearchResult;
    })
    .sort((a, b) => b._searchScore - a._searchScore)
    .slice(0, RESULT_LIMIT);
}

// ══════════════════════════════════════════════════════════════════════════════
// CROSS-ENCODER RERANKING (second stage)
// ══════════════════════════════════════════════════════════════════════════════

/** Weight of the cross-encoder vs the first-stage hybrid score */
const RERANK_WEIGHT = 0.5;

/**
 * Logit → 0–100 calibration: 100 × sigmoid(logit / RERANK_LOGIT_SCALE).
 * On this catalogue clear matches score +4…+9 (→ 88–99), partial matches
 * 0…+2 (→ 50–73), non-matches −4…−10 (→ 1–12).
 *
 * Absolute (not per-query min-max) on purpose: when the cross-encoder judges
 * every candidate irrelevant, their logits differ only by noise, and min-max
 * would stretch that noise across 0–100 and let it override the first stage.
 */
const RERANK_LOGIT_SCALE = 2;

/**
 * Re-scores the hybrid-ranked shortlist with the cross-encoder and blends:
 * RERANK_WEIGHT × rerank + (1 − RERANK_WEIGHT) × hybrid. Keeping part of the
 * hybrid score preserves signals the cross-encoder doesn't see well (exact
 * location boost, featured, DB relevance, skill synonyms like Flutter→mobile).
 */
async function rerankResults(query: string, ranked: SearchResult[]): Promise<SearchResult[]> {
  if (ranked.length === 0) return ranked;

  const started = Date.now();
  const logits = await rerankScores(query, ranked.map(rerankPassage));

  const reranked = ranked
    .map((r, i) => {
      const rerankPct = 100 / (1 + Math.exp(-logits[i] / RERANK_LOGIT_SCALE));
      return {
        ...r,
        _searchScore: Math.round(RERANK_WEIGHT * rerankPct + (1 - RERANK_WEIGHT) * r._searchScore),
      };
    })
    .sort((a, b) => b._searchScore - a._searchScore);

  console.log(`[AISearch] 🎯 Cross-encoder reranked ${ranked.length} results in ${Date.now() - started}ms`);
  return reranked;
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPLANATION GENERATOR
// ══════════════════════════════════════════════════════════════════════════════

function generateExplanation(intent: SearchIntent, count: number): string {
  if (count === 0) {
    const suggestions: string[] = [];
    if (intent.location) suggestions.push("removing the location filter");
    if (intent.timeRange) suggestions.push("extending the time range");
    if (intent.category) suggestions.push("trying a different category");
    const tip =
      suggestions.length > 0
        ? ` Try ${suggestions.join(" or ")}.`
        : " Try broadening your search terms.";
    return `No exact matches found.${tip}`;
  }

  const parts: string[] = [`We found ${count} ${count === 1 ? "opportunity" : "opportunities"}`];
  const filters: string[] = [];

  if (intent.category) {
    filters.push(`${intent.category.toLowerCase()}s`);
  }
  if (intent.skills.length > 0) {
    filters.push(`focused on ${intent.skills.slice(0, 2).join(" and ")}`);
  } else if (intent.keywords.length > 0) {
    const relevantKw = intent.keywords
      .filter((k) => k.length > 3)
      .slice(0, 2);
    if (relevantKw.length > 0) filters.push(`related to ${relevantKw.join(" and ")}`);
  }
  if (intent.location) filters.push(`in ${intent.location}`);
  if (intent.studentType) filters.push(`for ${intent.studentType} students`);
  if (intent.timeRange) {
    const labels: Record<SearchTimeRange, string> = {
      this_week: "this week",
      this_month: "this month",
      next_month: "next month",
      this_year: "this year",
    };
    filters.push(labels[intent.timeRange]);
  }

  if (filters.length > 0) parts.push(filters.join(", "));

  return parts.join(" ") + ".";
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORTED FUNCTION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Pipeline stage switches — all on in production. Turned off individually by
 * the offline evaluation (scripts/eval_search.ts) to measure each stage.
 */
export interface SearchPipelineOptions {
  /** Gemini intent extraction (false = rule-based only, deterministic) */
  llmIntent?: boolean;
  /** Embedding retrieval + hybrid scoring (false = keyword-only) */
  semantic?: boolean;
  /** Cross-encoder second stage */
  rerank?: boolean;
}

export async function aiSearch(
  query: string,
  userId?: string | null,
  explicitFilters?: StructuredFilters,
  { llmIntent = true, semantic = true, rerank = true }: SearchPipelineOptions = {}
): Promise<SearchResponse> {
  let intent: SearchIntent;
  let source: "ai" | "fallback" = "ai";

  // 1. Try Gemini (1 call per search — never called per-opportunity)
  try {
    if (!llmIntent) throw new Error("disabled by pipeline options");
    intent = await extractWithGemini(query);
    console.log("[AISearch] ✅ Gemini extracted intent:", JSON.stringify(intent));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.warn(`[AISearch] ⚡ Gemini unavailable (${msg}), using rule-based fallback`);
    intent = ruleBasedExtract(query);
    source = "fallback";
  }

  // 2. Guard against empty intent — try to extract keywords from raw query
  const hasFilter =
    intent.category ||
    intent.location ||
    intent.mode ||
    intent.timeRange ||
    intent.keywords.length > 0 ||
    intent.skills.length > 0 ||
    intent.studentType;

  if (!hasFilter) {
    intent = ruleBasedExtract(query);
    source = "fallback";
  }

  // 3. Execute safe Prisma queries (expired opportunities already excluded).
  // Explicit user-selected filters take priority over the LLM's guess.
  const { rows: retrieved, similarity } = await executeSearch(query, intent, explicitFilters, semantic);

  // Effective intent — LLM guess with explicit filter overrides applied.
  // Used for the response's `intent` (search-page chips) and explanation,
  // so the UI reflects what was ACTUALLY applied, not the LLM's raw guess.
  const effectiveIntent = mergeIntentWithFilters(intent, explicitFilters);

  // 4A. If user is logged in: blend personalization into ranking (70% search + 30% profile)
  // 4B. If anonymous: rank by search score only
  let results: SearchResult[];
  let personalized = false;

  // Hybrid-ranked, trimmed to RESULT_LIMIT, then cross-encoder reranked.
  // Reranker failure is non-fatal — keep the first-stage order.
  const hybridRanked = rankResults(retrieved, effectiveIntent, similarity);
  let baseRanked = hybridRanked;
  let reranked = false;
  try {
    if (rerank) {
      baseRanked = await rerankResults(query, hybridRanked);
      reranked = true;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[AISearch] ⚡ Reranker unavailable (${msg}), using first-stage ranking`);
  }
  const keptIds = new Set(baseRanked.map((r) => r.id));
  const rawResults = retrieved.filter((r) => keptIds.has(r.id));

  if (userId && rawResults.length > 0) {
    try {
      // Build search score map for blending
      const searchScoreMap: Record<string, number> = {};
      for (const r of baseRanked) {
        searchScoreMap[r.id] = r._searchScore;
      }

      // Personalize: 70% search + 30% profile match
      const personalizedResults = await personalizeSearchResults(userId, rawResults, searchScoreMap);

      results = personalizedResults.map((p) => {
        const base = baseRanked.find((r) => r.id === p.opportunity.id)!;
        return {
          ...base,
          _searchScore: p.blendedScore,
        };
      });
      personalized = true;

      console.log(`[AISearch] 👤 Personalized ranking applied for userId=${userId}`);
    } catch (err) {
      // Personalization failure is non-fatal — fall back to pure search ranking
      console.warn("[AISearch] Personalization failed, using search-only ranking:", err);
      results = baseRanked;
    }
  } else {
    results = baseRanked;
  }

  // 5. Generate explanation from the effective (post-override) intent
  const explanation = generateExplanation(effectiveIntent, results.length);

  return {
    intent: effectiveIntent,
    results,
    explanation,
    totalCount: results.length,
    source,
    personalized,
    semantic: similarity !== null,
    reranked,
  };
}
