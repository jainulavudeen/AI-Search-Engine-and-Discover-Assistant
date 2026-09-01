/**
 * Recommendation Service — Transparent Scoring Algorithm
 *
 * This is a rule-based matching system. The UI labels it "AI Match" to indicate
 * that AI features are used elsewhere on the platform (e.g. natural-language
 * search). The score itself is NOT produced by a machine-learning model and
 * should be treated as a helpful guide, not a scientific prediction.
 *
 * ── Scoring weights (total = 100 points) ──────────────────────────────────────
 *
 * ┌───────────────────┬────────┬────────────────────────────────────────────────┐
 * │ Factor            │ Weight │ Logic                                          │
 * ├───────────────────┼────────┼────────────────────────────────────────────────┤
 * │ Interest / domain │  25 pts│ User interests match opp title/description/tags│
 * │ Category / type   │  20 pts│ User preferred types match opp category        │
 * │ Eligibility       │  20 pts│ User course/year match opp eligibility text    │
 * │ Location          │  15 pts│ User preferred locations match opp location    │
 * │ Skill             │  10 pts│ User interests (as skills) match opp skills    │
 * │ Mode preference   │   5 pts│ User mode pref (online/offline) matches opp   │
 * │ Deadline relevance│   5 pts│ Active opps with upcoming deadlines score more │
 * └───────────────────┴────────┴────────────────────────────────────────────────┘
 * Total: 100 points
 *
 * ── Engagement boosters (applied after base score, total capped at 100) ────────
 *
 * │ Previous search overlap  │ +4  │ Opp matches a recent search query    │
 * │ Saved-category overlap   │ +3  │ User bookmarked opps in same category │
 *
 * Signals used (all sourced from the actual student profile in the database):
 *   1.  Student interests      (user.interests[])
 *   2.  Preferred opp types    (user.opportunityTypes[])
 *   3.  Course                 (user.course)
 *   4.  Year of study          (user.year)
 *   5.  Preferred locations    (user.preferredLocations[])
 *   6.  Previous searches      (SearchInteraction table)
 *   7.  Saved/bookmarked opps  (Bookmark table — category signal)
 *   8.  Opportunity category   (opp.category)
 *   9.  Opportunity eligibility(opp.eligibility)
 *  10.  Opportunity skills/tags(opp.skills, opp.tags)
 *  11.  Opportunity mode       (opp.mode)
 *  12.  Registration deadline  (opp.registrationDeadline)
 */

import prisma from "../lib/prisma";
import { Opportunity, User } from "@prisma/client";

// ══════════════════════════════════════════════════════════════════════════════
// WEIGHTS (must sum to 100)
// ══════════════════════════════════════════════════════════════════════════════

const WEIGHTS = {
  interest:    25,
  category:    20,
  eligibility: 20,
  location:    15,
  skill:       10,
  mode:         5,
  deadline:     5,
} as const;

// Engagement boosters — added after the base score, total capped at 100
const BOOSTERS = {
  /** +4 if the opportunity text overlaps a recent search query (signal 6) */
  searchHistory: 4,
  /** +3 if the user has bookmarked another opportunity in the same category (signal 7) */
  savedCategory: 3,
  /** +3 if the user has repeatedly viewed opportunities in the same domain (Phase 16) */
  viewedDomain: 3,
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// LOCATION ALIAS NORMALIZATION
// Handles regional spelling variants so "Bengaluru" matches "Bangalore" etc.
// ══════════════════════════════════════════════════════════════════════════════

const LOCATION_ALIASES: Record<string, string[]> = {
  "bangalore":  ["bengaluru", "bangalore", "blr"],
  "mumbai":     ["bombay", "mumbai", "mum"],
  "chennai":    ["madras", "chennai", "maa"],
  "delhi":      ["new delhi", "delhi", "ncr", "noida", "gurgaon", "gurugram"],
  "hyderabad":  ["hyderabad", "hyd", "secunderabad", "cyberabad"],
  "kolkata":    ["calcutta", "kolkata", "kkr"],
  "pune":       ["pune"],
  "online":     ["online", "virtual", "remote", "anywhere", "global"],
};

/** Returns the canonical city name for a raw location string, or the input lowercased. */
function canonicalCity(raw: string): string {
  const lc = raw.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(LOCATION_ALIASES)) {
    if (aliases.some((a) => lc.includes(a))) return canonical;
  }
  return lc;
}

// ══════════════════════════════════════════════════════════════════════════════
// INTEREST → KEYWORD EXPANSION
// Expands user interests into keyword sets for text matching
// ══════════════════════════════════════════════════════════════════════════════

export const INTEREST_EXPANSION: Record<string, string[]> = {
  "Artificial Intelligence":  ["artificial intelligence", "ai", "machine learning", "deep learning", "neural", "nlp", "llm", "genai", "generative", "gpt"],
  "Machine Learning":         ["machine learning", "ml", "deep learning", "neural network", "data model", "tensorflow", "pytorch", "scikit"],
  "Web Development":          ["web", "frontend", "backend", "fullstack", "react", "nextjs", "node", "javascript", "html", "css", "typescript"],
  "Cloud Computing":          ["cloud", "aws", "azure", "gcp", "google cloud", "devops", "docker", "kubernetes", "serverless", "infrastructure"],
  "Cybersecurity":            ["cybersecurity", "security", "ethical hacking", "penetration", "network security", "ctf", "infosec", "vulnerability"],
  "Data Science":             ["data science", "data analytics", "analytics", "statistics", "visualization", "pandas", "sql", "big data", "bi"],
  "Mobile Development":       ["mobile", "android", "ios", "flutter", "react native", "swift", "kotlin", "app development"],
  "IoT":                      ["iot", "internet of things", "embedded", "arduino", "raspberry", "sensors", "hardware", "firmware"],
  "Blockchain":               ["blockchain", "web3", "smart contract", "cryptocurrency", "solidity", "defi", "nft", "ethereum"],
  "Robotics":                 ["robotics", "robot", "automation", "ros", "autonomous", "drone"],
  "Game Development":         ["game", "unity", "unreal", "gaming", "game development"],
  "UI/UX Design":             ["ui", "ux", "design", "figma", "user interface", "user experience", "prototype"],
  "Product Management":       ["product", "product management", "agile", "scrum", "roadmap"],
  "Finance & Fintech":        ["finance", "fintech", "trading", "investment", "banking", "payments"],
  "Entrepreneurship":         ["startup", "entrepreneurship", "business", "venture", "innovation"],
};

// Fallback: any word from interest > 3 chars used as a keyword
function expandInterest(interest: string): string[] {
  const normalised = interest.trim();
  const predefined = INTEREST_EXPANSION[normalised];
  if (predefined) return predefined;
  return [normalised.toLowerCase(), ...normalised.toLowerCase().split(/\s+/).filter((w) => w.length > 3)];
}

// ══════════════════════════════════════════════════════════════════════════════
// CATEGORY MAPPING
// User.opportunityTypes → Opportunity.category enum
// ══════════════════════════════════════════════════════════════════════════════

const TYPE_TO_CATEGORY: Record<string, string> = {
  Hackathons:    "HACKATHON",
  Internships:   "INTERNSHIP",
  Workshops:     "WORKSHOP",
  Competitions:  "COMPETITION",
  Conferences:   "CONFERENCE",
  Scholarships:  "SCHOLARSHIP",
};

// ══════════════════════════════════════════════════════════════════════════════
// ELIGIBILITY KEYWORDS FROM COURSE
// ══════════════════════════════════════════════════════════════════════════════

const COURSE_ELIGIBILITY_KEYWORDS: Record<string, string[]> = {
  "Computer Science":       ["computer science", "cs", "engineering", "undergraduate", "btech", "b.tech", "b.e", "cse", "software"],
  "Information Technology": ["information technology", "it", "engineering", "undergraduate", "btech"],
  "Electronics":            ["electronics", "ece", "electrical", "engineering", "undergraduate"],
  "Mechanical":             ["mechanical", "engineering", "undergraduate"],
  "Civil":                  ["civil", "engineering", "undergraduate"],
  "Other":                  ["undergraduate", "student", "all students"],
};

// ══════════════════════════════════════════════════════════════════════════════
// YEAR → ELIGIBILITY TEXT
// ══════════════════════════════════════════════════════════════════════════════

const YEAR_ELIGIBILITY_KEYWORDS: Record<number, string[]> = {
  1: ["1st year", "first year", "fresher", "all years", "all students"],
  2: ["2nd year", "second year", "all years", "all students"],
  3: ["3rd year", "third year", "all years", "penultimate", "pre-final", "all students"],
  4: ["4th year", "final year", "all years", "graduating", "all students"],
  5: ["postgraduate", "pg", "masters", "m.tech", "mca"],
};

// ══════════════════════════════════════════════════════════════════════════════
// DEADLINE RELEVANCE SCORING (5 pts)
// Active, soon-closing deadlines score highest.
// Expired opportunities score 0 on this factor.
// ══════════════════════════════════════════════════════════════════════════════

function deadlineScore(registrationDeadline: Date): number {
  const now = new Date();
  const msRemaining = registrationDeadline.getTime() - now.getTime();
  const daysRemaining = msRemaining / (1000 * 60 * 60 * 24);

  if (daysRemaining < 0) return 0;                         // expired
  if (daysRemaining <= 3) return WEIGHTS.deadline;         // urgent: closes in ≤3 days (full 5pts)
  if (daysRemaining <= 7) return Math.max(Math.round(WEIGHTS.deadline * 0.7), WEIGHTS.deadline - 2);  // ≤7 days (≤3pts gap from max)
  if (daysRemaining <= 14) return Math.round(WEIGHTS.deadline * 0.5); // 2 weeks
  if (daysRemaining <= 30) return Math.round(WEIGHTS.deadline * 0.4); // 1 month
  if (daysRemaining <= 90) return Math.round(WEIGHTS.deadline * 0.3); // 3 months
  return 1;                                                // far future — always > 0
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ScoreBreakdown {
  interest:    number;  // 0–25
  category:    number;  // 0–20
  eligibility: number;  // 0–20
  location:    number;  // 0–15
  skill:       number;  // 0–10
  mode:        number;  // 0–5
  deadline:    number;  // 0–5
  total:       number;  // 0–100
}

export interface MatchedFactor {
  factor: "interest" | "category" | "location" | "eligibility" | "skill" | "mode" | "deadline" | "engagement";
  label: string;
  detail: string;
  points: number;
  maxPoints: number;
}

export interface RecommendationResult {
  opportunity: Opportunity;
  score: number;           // 0–100 (rounded, clamped)
  reason: string;          // One-sentence natural language explanation
  breakdown: ScoreBreakdown;
  matchedFactors: MatchedFactor[];
}

/**
 * Engagement context derived from signals 6 & 7, plus Phase 16's viewedDomains
 * (repeated views, not just bookmarks, can now nudge scoring too):
 *   - searchTerms: lower-cased queries from SearchInteraction (signal 6)
 *   - savedCategories: categories of bookmarked opps (signal 7)
 *   - viewedDomains: domains (per INTEREST_EXPANSION) the student has viewed/
 *     clicked into 2+ DISTINCT opportunities for recently. Deliberately NOT
 *     based on recommendation impressions (being shown something is not a
 *     signal of interest — that would create a feedback loop where whatever
 *     is shown most gets boosted most, regardless of actual engagement).
 */
interface EngagementContext {
  searchTerms: string[];
  savedCategories: Set<string>;
  viewedDomains: Set<string>;
}

// ══════════════════════════════════════════════════════════════════════════════
// CORE SCORING FUNCTION
// ══════════════════════════════════════════════════════════════════════════════

function scoreOpportunity(user: User, opp: Opportunity, ctx: EngagementContext): RecommendationResult {
  const txt = [opp.title, opp.description, opp.eligibility, ...opp.tags, ...opp.skills]
    .join(" ")
    .toLowerCase();

  const matchedFactors: MatchedFactor[] = [];

  // ── 1. Interest match (25 pts) ────────────────────────────────────────────

  let interestScore = 0;
  const matchedInterests: string[] = [];

  if (user.interests.length > 0) {
    const pointsPerInterest = Math.floor(WEIGHTS.interest / Math.min(user.interests.length, 3));

    for (const interest of user.interests) {
      const keywords = expandInterest(interest);
      const hit = keywords.some((kw) => txt.includes(kw));
      if (hit) {
        matchedInterests.push(interest);
        interestScore = Math.min(interestScore + pointsPerInterest, WEIGHTS.interest);
      }
    }

    if (matchedInterests.length > 0) {
      matchedFactors.push({
        factor: "interest",
        label: "Interest match",
        detail: `Your interest in ${matchedInterests.slice(0, 2).join(" and ")} aligns with this opportunity.`,
        points: interestScore,
        maxPoints: WEIGHTS.interest,
      });
    }
  }

  // ── 2. Category match (20 pts) ───────────────────────────────────────────

  let categoryScore = 0;

  if (user.opportunityTypes.length > 0) {
    const preferredCategories = user.opportunityTypes
      .map((t) => TYPE_TO_CATEGORY[t])
      .filter(Boolean);

    if (preferredCategories.includes(opp.category)) {
      categoryScore = WEIGHTS.category;
      const typeName =
        Object.entries(TYPE_TO_CATEGORY).find(([, v]) => v === opp.category)?.[0] ?? opp.category;
      matchedFactors.push({
        factor: "category",
        label: "Category match",
        detail: `You're looking for ${typeName.toLowerCase()} opportunities, and this is one.`,
        points: categoryScore,
        maxPoints: WEIGHTS.category,
      });
    }
  }

  // ── 3. Eligibility match (20 pts) ────────────────────────────────────────

  let eligibilityScore = 0;

  const courseKeywords = user.course
    ? COURSE_ELIGIBILITY_KEYWORDS[user.course] ?? [user.course.toLowerCase()]
    : [];
  const yearKeywords = user.year ? YEAR_ELIGIBILITY_KEYWORDS[user.year] ?? [] : [];

  const courseHit = courseKeywords.some((kw) => txt.includes(kw));
  const yearHit   = yearKeywords.some((kw) => txt.includes(kw));

  // Generic fallback — "all students" matches everything
  const genericMatch = txt.includes("all students") || txt.includes("all years") ||
                       txt.includes("open to all") || txt.includes("everyone");

  if (genericMatch) {
    eligibilityScore = Math.round(WEIGHTS.eligibility * 0.75);
  } else {
    if (courseHit) eligibilityScore += Math.round(WEIGHTS.eligibility * 0.6);
    if (yearHit)   eligibilityScore += Math.round(WEIGHTS.eligibility * 0.4);
    eligibilityScore = Math.min(eligibilityScore, WEIGHTS.eligibility);
  }

  if (eligibilityScore > 0) {
    const parts: string[] = [];
    if (courseHit && user.course) parts.push(`open to ${user.course} students`);
    if (yearHit && user.year) {
      const suffix = ["st","nd","rd","th"][Math.min(user.year - 1, 3)];
      parts.push(`suitable for ${user.year}${suffix} year students`);
    }
    if (genericMatch) parts.push("open to all students");
    matchedFactors.push({
      factor: "eligibility",
      label: "Eligibility match",
      detail: `This opportunity is ${parts.join(" and ")}.`,
      points: eligibilityScore,
      maxPoints: WEIGHTS.eligibility,
    });
  }

  // ── 4. Location match (15 pts) ───────────────────────────────────────────

  let locationScore = 0;

  if (user.preferredLocations.length > 0) {
    const isOnlinePreferred  = user.preferredLocations.some((l) => canonicalCity(l) === "online");
    const isAnywherePreferred = user.preferredLocations.includes("Anywhere");
    const oppLocationCanon   = canonicalCity(opp.location);
    const isOppOnline        = opp.mode === "ONLINE" || oppLocationCanon === "online";

    if (isAnywherePreferred) {
      locationScore = Math.round(WEIGHTS.location * 0.75);
      matchedFactors.push({
        factor: "location",
        label: "Location flexible",
        detail: "You're open to opportunities anywhere.",
        points: locationScore,
        maxPoints: WEIGHTS.location,
      });
    } else if (isOnlinePreferred && isOppOnline) {
      locationScore = WEIGHTS.location;
      matchedFactors.push({
        factor: "location",
        label: "Online preference",
        detail: "You prefer online opportunities, and this one is fully online.",
        points: locationScore,
        maxPoints: WEIGHTS.location,
      });
    } else {
      // City-to-city match using canonical aliases
      const preferredCanons = user.preferredLocations.map(canonicalCity);
      const cityMatch = preferredCanons.includes(oppLocationCanon);

      if (cityMatch) {
        locationScore = WEIGHTS.location;
        matchedFactors.push({
          factor: "location",
          label: "Location match",
          detail: `${opp.location} is one of your preferred locations.`,
          points: locationScore,
          maxPoints: WEIGHTS.location,
        });
      } else if (opp.mode === "ONLINE" && isOnlinePreferred) {
        locationScore = WEIGHTS.location;
      } else if (opp.mode === "HYBRID") {
        // Hybrid gets partial credit — partially accessible
        locationScore = Math.round(WEIGHTS.location * 0.5);
      } else if (isOppOnline) {
        // Online opportunity when user has city preference — partial credit
        locationScore = Math.round(WEIGHTS.location * 0.4);
      }
      // Otherwise locationScore stays 0 (unrelated city)
    }
  }

  // ── 5. Skill match (10 pts) ──────────────────────────────────────────────

  let skillScore = 0;
  const matchedSkills: string[] = [];

  // Derive skills from interests
  const userSkills = user.interests.flatMap((i) => {
    const kws = expandInterest(i);
    return kws.slice(0, 3); // first 3 keywords per interest
  });

  const oppSkills = [...opp.skills, ...opp.tags].map((s) => s.toLowerCase());

  for (const skill of userSkills) {
    const hit = oppSkills.some((s) => s.includes(skill) || skill.includes(s));
    if (hit) {
      const displaySkill = opp.skills.find((s) => s.toLowerCase().includes(skill)) ?? skill;
      if (!matchedSkills.includes(displaySkill)) matchedSkills.push(displaySkill);
      skillScore = Math.min(skillScore + 5, WEIGHTS.skill);
    }
  }

  if (matchedSkills.length > 0) {
    matchedFactors.push({
      factor: "skill",
      label: "Skill match",
      detail: `Your skills in ${matchedSkills.slice(0, 2).join(", ")} are relevant to this opportunity.`,
      points: skillScore,
      maxPoints: WEIGHTS.skill,
    });
  }

  // ── 6. Mode preference (5 pts) ───────────────────────────────────────────

  let modeScore = 0;

  // Infer mode preference from preferredLocations ("Online") or opportunityTypes
  const prefersOnline = user.preferredLocations.some((l) => canonicalCity(l) === "online");

  if (prefersOnline && opp.mode === "ONLINE") {
    modeScore = WEIGHTS.mode;
    matchedFactors.push({
      factor: "mode",
      label: "Mode preference",
      detail: "This online opportunity matches your preference for remote participation.",
      points: modeScore,
      maxPoints: WEIGHTS.mode,
    });
  } else if (!prefersOnline && opp.mode === "OFFLINE") {
    modeScore = Math.round(WEIGHTS.mode * 0.8);
  } else if (opp.mode === "HYBRID") {
    modeScore = Math.round(WEIGHTS.mode * 0.5);
  }

  // ── 7. Deadline relevance (5 pts) ────────────────────────────────────────

  const dlScore = deadlineScore(opp.registrationDeadline);

  if (dlScore > 0) {
    const now = new Date();
    const daysLeft = Math.ceil(
      (opp.registrationDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const urgencyLabel =
      daysLeft <= 3 ? "Closes very soon" :
      daysLeft <= 7 ? "Closes this week" :
      daysLeft <= 14 ? "Closes in 2 weeks" :
      "Registration open";

    matchedFactors.push({
      factor: "deadline",
      label: "Active deadline",
      detail: `${urgencyLabel} — ${daysLeft} days remaining.`,
      points: dlScore,
      maxPoints: WEIGHTS.deadline,
    });
  }

  // ── Base score ─────────────────────────────────────────────────────────────

  const baseScore = interestScore + categoryScore + eligibilityScore +
                    locationScore + skillScore + modeScore + dlScore;

  // ── Engagement boosters (signals 6 & 7) ───────────────────────────────────
  // These use DB-sourced signals but do NOT change the factor breakdown;
  // they nudge the final score by a small, bounded amount.

  let boostTotal = 0;

  // Signal 6: previous search overlap
  let hasSearchOverlap = false;
  if (ctx.searchTerms.length > 0) {
    const oppText = [opp.title, opp.description, ...opp.tags].join(" ").toLowerCase();
    hasSearchOverlap = ctx.searchTerms.some((term) => {
      const words = term.split(/\s+/).filter((w) => w.length > 3);
      return words.some((w) => oppText.includes(w));
    });
    if (hasSearchOverlap) boostTotal += BOOSTERS.searchHistory;
  }

  // Signal 7: saved category overlap
  const hasSavedCategoryOverlap = ctx.savedCategories.has(opp.category);
  if (hasSavedCategoryOverlap) boostTotal += BOOSTERS.savedCategory;

  // Phase 16 signal: repeated views in the same domain as this opportunity
  let matchedViewedDomain: string | null = null;
  for (const domain of ctx.viewedDomains) {
    if (expandInterest(domain).some((kw) => txt.includes(kw))) {
      matchedViewedDomain = domain;
      break;
    }
  }
  if (matchedViewedDomain) boostTotal += BOOSTERS.viewedDomain;

  // Engagement boosters are transparent, not silent — surface them as a
  // matched factor (not part of the fixed 100-pt breakdown, since they're
  // bonus points on top of it) so "why this matches you" stays honest.
  if (boostTotal > 0) {
    const reasons: string[] = [];
    if (hasSearchOverlap) reasons.push("a recent search of yours");
    if (hasSavedCategoryOverlap) reasons.push(`opportunities you've saved before`);
    if (matchedViewedDomain) reasons.push(`your recent interest in ${matchedViewedDomain}`);
    matchedFactors.push({
      factor: "engagement",
      label: "Your activity",
      detail: `Boosted because it's similar to ${reasons.join(" and ")}.`,
      points: boostTotal,
      maxPoints: boostTotal,
    });
  }

  const total = Math.min(Math.max(Math.round(baseScore + boostTotal), 0), 100);

  const breakdown: ScoreBreakdown = {
    interest:    interestScore,
    category:    categoryScore,
    eligibility: eligibilityScore,
    location:    locationScore,
    skill:       skillScore,
    mode:        modeScore,
    deadline:    dlScore,
    total,
  };

  const reason = generateReason(total, matchedFactors, opp, user);

  return { opportunity: opp, score: total, reason, breakdown, matchedFactors };
}

// ══════════════════════════════════════════════════════════════════════════════
// REASON GENERATOR
// Builds a one-sentence explanation using matched factors only.
// Does NOT invent information not in the profile or opportunity record.
// ══════════════════════════════════════════════════════════════════════════════

function generateReason(
  score: number,
  factors: MatchedFactor[],
  opp: Opportunity,
  user: User
): string {
  if (factors.length === 0) {
    return `This ${opp.category.toLowerCase()} may interest you based on your profile.`;
  }

  const strength =
    score >= 85 ? "Strong match" :
    score >= 65 ? "Good match" :
    "Partial match";

  const highlights = factors
    .sort((a, b) => b.points - a.points) // highest-scoring factors first
    .slice(0, 2)
    .map((f) => {
      switch (f.factor) {
        case "interest":
          return user.interests.length > 0
            ? `you're interested in ${user.interests.slice(0, 2).join(" and ")}`
            : null;
        case "category":
          return `this is a ${opp.category.toLowerCase()} you prefer`;
        case "location":
          return opp.mode === "ONLINE"
            ? "it's available online"
            : `it's in ${opp.location.split(",")[0]}`;
        case "eligibility":
          return user.course ? `it's open to ${user.course} students` : "you're eligible";
        case "skill":
          return "it uses your skills";
        case "mode":
          return opp.mode === "ONLINE" ? "it's fully online" : null;
        case "deadline":
          return null; // deadline urgency shown separately in UI
        case "engagement":
          return "it's similar to opportunities you've engaged with recently";
        default:
          return null;
      }
    })
    .filter(Boolean);

  if (highlights.length === 0) return `${strength} — this opportunity fits your profile.`;
  if (highlights.length === 1) return `${strength} — ${highlights[0]}.`;
  return `${strength} because ${highlights.join(", and ")}.`;
}

// ══════════════════════════════════════════════════════════════════════════════
// DEFAULT SCORING (no onboarding data)
// ══════════════════════════════════════════════════════════════════════════════

function scoreDefault(opp: Opportunity): RecommendationResult {
  const dlScore = deadlineScore(opp.registrationDeadline);
  const base = Math.min(opp.relevanceScore + (opp.featured ? 5 : 0), 72);
  const total = Math.min(Math.max(base + dlScore, 0), 100);

  return {
    opportunity: opp,
    score: total,
    reason: opp.featured
      ? "Featured opportunity — highly rated by the community."
      : "Popular opportunity for students.",
    breakdown: {
      interest:    0,
      category:    0,
      eligibility: Math.round(total * 0.4),
      location:    Math.round(total * 0.3),
      skill:       Math.round(total * 0.2),
      mode:        0,
      deadline:    dlScore,
      total,
    },
    matchedFactors: [],
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ENGAGEMENT CONTEXT LOADER
// Fetches search history (signal 6) and bookmarked categories (signal 7)
// ══════════════════════════════════════════════════════════════════════════════

// A domain counts as "recently active interest" once the student has
// engaged with (viewed/clicked) at least this many DISTINCT opportunities
// matching it. One view isn't a pattern; a threshold avoids over-reacting
// to a single click.
const VIEWED_DOMAIN_THRESHOLD = 2;

async function loadEngagementContext(userId: string): Promise<EngagementContext> {
  const [searchHistory, bookmarks, interactions] = await Promise.all([
    prisma.searchInteraction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20, // last 20 searches
      select: { query: true },
    }),
    prisma.bookmark.findMany({
      where: { userId },
      include: { opportunity: { select: { category: true } } },
    }),
    // Real engagement only — never recommendation impressions, which are
    // "shown to", not "acted on" (see EngagementContext docs above).
    prisma.opportunityInteraction.findMany({
      where: { userId, type: { in: ["VIEW", "REGISTER_CLICK", "RECOMMENDATION_CLICK"] } },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { opportunity: { select: { title: true, description: true, skills: true, tags: true } } },
    }),
  ]);

  // Dedupe to distinct opportunities before counting domain frequency, so
  // repeatedly opening the same opportunity doesn't look like broad interest.
  const seenOppIds = new Set<string>();
  const distinctTexts: string[] = [];
  for (const i of interactions) {
    if (seenOppIds.has(i.opportunityId)) continue;
    seenOppIds.add(i.opportunityId);
    const o = i.opportunity;
    distinctTexts.push([o.title, o.description, ...o.skills, ...o.tags].join(" ").toLowerCase());
  }

  const viewedDomains = new Set<string>();
  for (const domain of Object.keys(INTEREST_EXPANSION)) {
    const keywords = expandInterest(domain);
    const matchCount = distinctTexts.filter((txt) => keywords.some((kw) => txt.includes(kw))).length;
    if (matchCount >= VIEWED_DOMAIN_THRESHOLD) viewedDomains.add(domain);
  }

  return {
    searchTerms: searchHistory.map((s) => s.query.toLowerCase()),
    savedCategories: new Set(bookmarks.map((b) => b.opportunity.category)),
    viewedDomains,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate personalised recommendations for a user.
 *
 * Uses all 12 signals:
 *   Profile     → interests, course, year, preferredLocations, opportunityTypes
 *   Engagement  → searchHistory (signal 6), bookmarkedCategories (signal 7)
 *   Opportunity → category (8), eligibility (9), skills/tags (10), mode (11), deadline (12)
 *
 * Falls back to relevance-sorted list when student profile is incomplete.
 *
 * Expired opportunities are EXCLUDED from recommendations.
 */
export async function generateRecommendations(
  userId: string,
  limit = 12
): Promise<RecommendationResult[]> {
  const now = new Date();

  // Exclude expired and admin-deactivated opportunities from recommendations
  const opportunities = await prisma.opportunity.findMany({
    where: { registrationDeadline: { gte: now }, isActive: true },
    orderBy: { relevanceScore: "desc" },
  });

  const scored = await rankOpportunitiesForUser(userId, opportunities);
  return scored.slice(0, limit);
}

/**
 * Score and rank an already-fetched (already filtered, e.g. by search/browse
 * filters) list of opportunities for a given user, without re-querying the
 * whole table. Used by generateRecommendations() above and by the "Highest
 * AI Match" sort on /api/opportunities so both share one scoring engine.
 */
export async function rankOpportunitiesForUser(
  userId: string,
  opportunities: Opportunity[]
): Promise<RecommendationResult[]> {
  const [user, ctx] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    loadEngagementContext(userId),
  ]);

  if (!user) return [];

  const hasProfile =
    user.interests.length > 0 ||
    user.preferredLocations.length > 0 ||
    user.opportunityTypes.length > 0;

  const scored = hasProfile
    ? opportunities.map((opp) => scoreOpportunity(user, opp, ctx))
    : opportunities.map((opp) => scoreDefault(opp));

  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Get the match score for a specific opportunity for a user.
 * Used on the opportunity details page for "Why this matches you".
 *
 * Note: does NOT filter expired — the detail page should still show the score
 * for a specific opportunity even if the deadline has passed.
 */
export async function getOpportunityMatch(
  userId: string,
  opportunityId: string
): Promise<RecommendationResult | null> {
  const [user, opp, ctx] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.opportunity.findUnique({ where: { id: opportunityId } }),
    loadEngagementContext(userId),
  ]);

  if (!user || !opp) return null;

  const hasProfile =
    user.interests.length > 0 ||
    user.preferredLocations.length > 0 ||
    user.opportunityTypes.length > 0;

  return hasProfile
    ? scoreOpportunity(user, opp, ctx)
    : scoreDefault(opp);
}

/**
 * Apply personalization boost to search results.
 *
 * Called by the search service when a user is logged in.
 * Takes a list of opportunities already filtered by the DB query,
 * and blends in the user's profile match score.
 *
 * The blend is 70% search relevance + 30% profile match, so that
 * the search intent remains the primary signal.
 *
 * Score is always clamped to 0–100.
 */
export async function personalizeSearchResults(
  userId: string,
  opportunities: Opportunity[],
  searchScores: Record<string, number>  // oppId → search score (0–100)
): Promise<Array<{ opportunity: Opportunity; blendedScore: number; reason: string }>> {
  if (opportunities.length === 0) return [];

  const now = new Date();
  const [user, ctx] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    loadEngagementContext(userId),
  ]);

  if (!user) {
    return opportunities.map((opp) => ({
      opportunity: opp,
      blendedScore: Math.min(Math.max(searchScores[opp.id] ?? opp.relevanceScore, 0), 100),
      reason: "Top result for your search.",
    }));
  }

  const hasProfile =
    user.interests.length > 0 ||
    user.preferredLocations.length > 0 ||
    user.opportunityTypes.length > 0;

  return opportunities
    .map((opp) => {
      const searchScore = Math.min(Math.max(searchScores[opp.id] ?? opp.relevanceScore, 0), 100);

      if (!hasProfile) {
        return { opportunity: opp, blendedScore: searchScore, reason: "Top result for your search." };
      }

      const match = scoreOpportunity(user, opp, ctx);
      // 70% search relevance + 30% profile match
      const blended = Math.min(Math.max(Math.round(searchScore * 0.7 + match.score * 0.3), 0), 100);

      return {
        opportunity: opp,
        blendedScore: blended,
        reason: match.reason,
      };
    })
    .sort((a, b) => b.blendedScore - a.blendedScore);
}
