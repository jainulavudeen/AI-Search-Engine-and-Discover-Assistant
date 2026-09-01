/**
 * Frontend API client for CampusFind AI backend.
 * Falls back to mock data when backend is unavailable.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// ── Shared fetch helper ───────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options?: RequestInit & { nextOptions?: NextFetchRequestConfig }
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Health ────────────────────────────────────────────────────────────────────

export interface HealthCheckResponse {
  status: "ok" | "error";
  service: string;
  version: string;
  environment: string;
}

export async function fetchHealthCheck(): Promise<HealthCheckResponse | null> {
  try {
    return await apiFetch<HealthCheckResponse>("/api/health", {
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

// ── Opportunity types ─────────────────────────────────────────────────────────

export type ApiCategory =
  | "HACKATHON"
  | "INTERNSHIP"
  | "WORKSHOP"
  | "COMPETITION"
  | "CONFERENCE"
  | "SCHOLARSHIP";

export type ApiMode = "ONLINE" | "OFFLINE" | "HYBRID";

export interface ApiOpportunity {
  id: string;
  title: string;
  description: string;
  category: ApiCategory;
  location: string;
  mode: ApiMode;
  startDate: string;
  endDate: string | null;
  registrationDeadline: string;
  organizer: string;
  eligibility: string;
  skills: string[];
  tags: string[];
  registrationUrl: string;
  relevanceScore: number;
  featured: boolean;
  /** Registration fee status — null/undefined when unknown (not fabricated) */
  isFree?: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunitiesResponse {
  status: "success" | "error";
  data: ApiOpportunity[];
  /** Per-opportunity AI Match score, present only for sort=ai_match while logged in */
  matchScores?: Record<string, number>;
  meta: {
    total: number;
    page: number;
    totalPages: number;
    filters: Record<string, string | undefined>;
  };
}

export interface OpportunityResponse {
  status: "success" | "error";
  data: ApiOpportunity;
}

// ── Opportunity queries ───────────────────────────────────────────────────────

export type OpportunitySort = "relevant" | "deadline" | "newest" | "ai_match";

export interface StructuredOpportunityFilters {
  category?: string;
  location?: string;
  mode?: string;
  eligibility?: string;
  date?: string;       // "today" | "week" | "month" | "next_month" | "upcoming"
  domain?: string;      // "AI" | "Machine Learning" | "Web Development" | "Cloud" | "Cybersecurity" | "Data Science" | "IoT" | "Other"
  registration?: string; // "free" | "paid"
}

export interface FetchOpportunitiesParams extends StructuredOpportunityFilters {
  search?: string;
  featured?: boolean;
  sort?: OpportunitySort;
  page?: number;
  limit?: number;
}

export async function fetchOpportunities(
  params: FetchOpportunitiesParams = {}
): Promise<OpportunitiesResponse | null> {
  try {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    });
    const query = qs.toString() ? `?${qs.toString()}` : "";
    // Attach auth token when present — unlocks sort=ai_match personalization;
    // anonymous browsing works identically without it.
    const headers = getAuthHeader();
    return await apiFetch<OpportunitiesResponse>(`/api/opportunities${query}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...headers },
    });
  } catch (err) {
    console.error("[api] fetchOpportunities failed:", err);
    return null;
  }
}

export async function fetchOpportunityById(
  id: string
): Promise<OpportunityResponse | null> {
  try {
    return await apiFetch<OpportunityResponse>(`/api/opportunities/${id}`, {
      cache: "no-store",
    });
  } catch (err) {
    console.error(`[api] fetchOpportunityById(${id}) failed:`, err);
    return null;
  }
}

// ── AI Search ─────────────────────────────────────────────────────────────────

export interface SearchIntent {
  category?: string | null;
  keywords: string[];
  location?: string | null;
  mode?: string | null;
  studentType?: string | null;
  timeRange?: string | null;
  skills: string[];
  deadlinePreference?: string | null;
}

export interface AiSearchResult {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  mode: string;
  startDate: string;
  endDate?: string | null;
  registrationDeadline: string;
  organizer: string;
  eligibility: string;
  skills: string[];
  tags: string[];
  registrationUrl: string;
  relevanceScore: number;
  featured: boolean;
  _searchScore: number;
}

export interface AiSearchResponse {
  intent: SearchIntent;
  results: AiSearchResult[];
  explanation: string;
  totalCount: number;
  source: "ai" | "fallback";
  /** true when results were re-ranked using the logged-in student's profile */
  personalized: boolean;
}

/**
 * @param filters Explicit sidebar filters. Takes priority over whatever the
 * LLM infers from `query` — see backend aiSearchService.mergeIntentWithFilters.
 */
export async function aiSearch(
  query: string,
  filters?: StructuredOpportunityFilters
): Promise<AiSearchResponse | null> {
  try {
    // Attach the auth token (if any) so the backend can personalize ranking
    // for logged-in students. Anonymous searches work identically without it.
    const headers = getAuthHeader();
    const res = await apiFetch<{ status: string; data: AiSearchResponse }>(
      "/api/search",
      {
        method: "POST",
        body: JSON.stringify({ query, filters }),
        cache: "no-store",
        headers: { "Content-Type": "application/json", ...headers },
      }
    );
    return res.data;
  } catch (err) {
    console.error("[api] aiSearch failed:", err);
    return null;
  }
}

// ── Recommendations ───────────────────────────────────────────────────────────

export interface MatchedFactor {
  factor: "interest" | "category" | "location" | "eligibility" | "skill" | "mode" | "deadline" | "engagement";
  label: string;
  detail: string;
  points: number;
  maxPoints: number;
}

export interface ScoreBreakdown {
  interest: number;
  category: number;
  location: number;
  eligibility: number;
  skill: number;
  mode: number;
  deadline: number;
  total: number;
}

export interface RecommendationItem {
  opportunity: AiSearchResult;
  score: number;
  reason: string;
  breakdown: ScoreBreakdown;
  matchedFactors: MatchedFactor[];
}

/** Fetch auth token from localStorage (client-side only) */
function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const token = localStorage.getItem("auth_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function fetchRecommendations(
  limit = 12
): Promise<RecommendationItem[] | null> {
  try {
    const headers = getAuthHeader();
    if (!headers.Authorization) return null;
    const res = await apiFetch<{ status: string; data: { recommendations: RecommendationItem[]; total: number } }>(
      `/api/recommendations?limit=${limit}`,
      { cache: "no-store", headers: { "Content-Type": "application/json", ...headers } }
    );
    return res.data.recommendations;
  } catch (err) {
    console.error("[api] fetchRecommendations failed:", err);
    return null;
  }
}

export async function fetchOpportunityMatch(
  opportunityId: string
): Promise<RecommendationItem | null> {
  try {
    const headers = getAuthHeader();
    if (!headers.Authorization) return null;
    const res = await apiFetch<{ status: string; data: RecommendationItem }>(
      `/api/recommendations/${opportunityId}`,
      { cache: "no-store", headers: { "Content-Type": "application/json", ...headers } }
    );
    return res.data;
  } catch (err) {
    console.error("[api] fetchOpportunityMatch failed:", err);
    return null;
  }
}

// -- Bookmarks ----------------------------------------------------------------

export interface BookmarkResponse {
  status: "success" | "error";
  bookmarked: boolean;
}

export interface BookmarksListResponse {
  status: "success" | "error";
  data: ApiOpportunity[];
  total: number;
}

/**
 * Fetch all bookmarked opportunities (full objects) for the logged-in user.
 */
export async function fetchBookmarks(): Promise<ApiOpportunity[] | null> {
  try {
    const headers = getAuthHeader();
    if (!headers.Authorization) return null;
    const res = await apiFetch<BookmarksListResponse>("/api/bookmarks", {
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...headers },
    });
    return res.data;
  } catch (err) {
    console.error("[api] fetchBookmarks failed:", err);
    return null;
  }
}

/**
 * Fetch only the IDs of bookmarked opportunities (lightweight, for syncing UI).
 */
export async function fetchBookmarkIds(): Promise<string[] | null> {
  try {
    const headers = getAuthHeader();
    if (!headers.Authorization) return null;
    const res = await apiFetch<{ status: string; data: string[] }>(
      "/api/bookmarks/ids",
      { cache: "no-store", headers: { "Content-Type": "application/json", ...headers } }
    );
    return res.data;
  } catch (err) {
    console.error("[api] fetchBookmarkIds failed:", err);
    return null;
  }
}

/**
 * Add a bookmark for the given opportunity.
 */
export async function addBookmark(
  opportunityId: string
): Promise<BookmarkResponse | null> {
  try {
    const headers = getAuthHeader();
    if (!headers.Authorization) return null;
    return await apiFetch<BookmarkResponse>(`/api/bookmarks/${opportunityId}`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...headers },
    });
  } catch (err) {
    console.error("[api] addBookmark failed:", err);
    return null;
  }
}

/**
 * Remove a bookmark for the given opportunity.
 */
export async function removeBookmark(
  opportunityId: string
): Promise<BookmarkResponse | null> {
  try {
    const headers = getAuthHeader();
    if (!headers.Authorization) return null;
    return await apiFetch<BookmarkResponse>(`/api/bookmarks/${opportunityId}`, {
      method: "DELETE",
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...headers },
    });
  } catch (err) {
    console.error("[api] removeBookmark failed:", err);
    return null;
  }
}

// -- Deadline utilities -------------------------------------------------------

export interface DeadlineInfo {
  /** Human-readable label e.g. "3 days left", "Closes tomorrow", "Deadline passed" */
  label: string;
  /** Number of days remaining (negative if passed) */
  daysRemaining: number;
  /** Visual urgency level */
  urgency: "passed" | "critical" | "urgent" | "soon" | "comfortable";
}

/**
 * Calculate a human-readable deadline label from an ISO date string.
 * Always calculates from the actual date — never hardcoded.
 *
 * Examples:
 *   "Deadline passed"
 *   "Closes today"
 *   "Registration closes tomorrow"
 *   "3 days left"
 *   "2 weeks left"
 *   "Opens 14 Oct 2026"
 */
export function calculateDeadline(registrationDeadline: string): DeadlineInfo {
  const now = new Date();
  // Strip time component for day-level comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadline = new Date(registrationDeadline);
  const deadlineDay = new Date(
    deadline.getFullYear(),
    deadline.getMonth(),
    deadline.getDate()
  );

  const diffMs = deadlineDay.getTime() - today.getTime();
  const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return { label: "Deadline passed", daysRemaining, urgency: "passed" };
  }
  if (daysRemaining === 0) {
    return { label: "Closes today", daysRemaining, urgency: "critical" };
  }
  if (daysRemaining === 1) {
    return { label: "Registration closes tomorrow", daysRemaining, urgency: "critical" };
  }
  if (daysRemaining <= 3) {
    return { label: `${daysRemaining} days left`, daysRemaining, urgency: "urgent" };
  }
  if (daysRemaining <= 7) {
    return { label: `${daysRemaining} days left`, daysRemaining, urgency: "soon" };
  }
  if (daysRemaining <= 14) {
    const weeks = Math.round(daysRemaining / 7);
    return {
      label: weeks === 1 ? "1 week left" : `${weeks} weeks left`,
      daysRemaining,
      urgency: "comfortable",
    };
  }
  return { label: `${daysRemaining} days left`, daysRemaining, urgency: "comfortable" };
}

/** CSS classes for deadline urgency levels (Tailwind) */
export const DEADLINE_STYLES: Record<
  DeadlineInfo["urgency"],
  { pill: string; text: string; dot: string }
> = {
  passed: {
    pill: "bg-slate-100 border-slate-200 text-slate-400",
    text: "text-slate-400",
    dot: "bg-slate-300",
  },
  critical: {
    pill: "bg-rose-50 border-rose-200 text-rose-700",
    text: "text-rose-600",
    dot: "bg-rose-500",
  },
  urgent: {
    pill: "bg-orange-50 border-orange-200 text-orange-700",
    text: "text-orange-600",
    dot: "bg-orange-500",
  },
  soon: {
    pill: "bg-amber-50 border-amber-200 text-amber-700",
    text: "text-amber-600",
    dot: "bg-amber-400",
  },
  comfortable: {
    pill: "bg-emerald-50 border-emerald-200 text-emerald-700",
    text: "text-emerald-600",
    dot: "bg-emerald-400",
  },
};

// ── Activity tracking (Phase 16) ────────────────────────────────────────────
// Fire-and-forget: tracking must never block or fail the student's actual
// action. Every call swallows its own errors and never throws. Works for
// anonymous visitors too (view/register-click don't require login).

async function track(path: string, opportunityId: string, token?: string): Promise<void> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const authToken = token ?? (typeof window !== "undefined" ? localStorage.getItem("auth_token") : null);
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ opportunityId }),
      // keepalive lets the request complete even if the page is about to
      // navigate away (e.g. clicking through to an external registration URL)
      keepalive: true,
    });
  } catch {
    // Never surface a tracking failure to the user.
  }
}

/** @param token Server-side callers (the opportunity detail page) pass the
 *  auth_token cookie value directly since localStorage isn't available there. */
export function trackView(opportunityId: string, token?: string): Promise<void> {
  return track("/api/interactions/view", opportunityId, token);
}

export function trackRegisterClick(opportunityId: string): Promise<void> {
  return track("/api/interactions/register-click", opportunityId);
}

export function trackRecommendationClick(opportunityId: string): Promise<void> {
  return track("/api/interactions/recommendation-click", opportunityId);
}

/** The logged-in student's own recently viewed opportunities — nobody else's. */
export async function fetchRecentViews(): Promise<ApiOpportunity[] | null> {
  try {
    const headers = getAuthHeader();
    if (!headers.Authorization) return null;
    const res = await apiFetch<{ status: string; data: ApiOpportunity[] }>(
      "/api/interactions/recent-views",
      { cache: "no-store", headers: { "Content-Type": "application/json", ...headers } }
    );
    return res.data;
  } catch (err) {
    console.error("[api] fetchRecentViews failed:", err);
    return null;
  }
}

