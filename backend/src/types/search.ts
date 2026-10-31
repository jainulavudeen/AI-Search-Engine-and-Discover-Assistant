// ── Search intent extracted by AI or rule-based fallback ─────────────────────

export type SearchCategory =
  | "HACKATHON"
  | "INTERNSHIP"
  | "WORKSHOP"
  | "COMPETITION"
  | "CONFERENCE"
  | "SCHOLARSHIP";

export type SearchTimeRange =
  | "this_week"
  | "this_month"
  | "next_month"
  | "this_year";

export interface SearchIntent {
  /** Primary opportunity category, null if not specified */
  category?: SearchCategory | null;
  /** Key concept words from the query */
  keywords: string[];
  /** City or region mentioned */
  location?: string | null;
  /** Online/offline preference */
  mode?: "ONLINE" | "OFFLINE" | "HYBRID" | null;
  /** Student type, e.g. "Engineering", "Computer Science" */
  studentType?: string | null;
  /** Temporal constraint */
  timeRange?: SearchTimeRange | null;
  /** Specific technical skills mentioned */
  skills: string[];
  /** Whether the user wants urgent or flexible deadlines */
  deadlinePreference?: "urgent" | "flexible" | null;
}

// ── Search API response ───────────────────────────────────────────────────────

export interface SearchResult {
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
  /** Boosted score used for ranking within this search */
  _searchScore: number;
}

export interface SearchResponse {
  intent: SearchIntent;
  results: SearchResult[];
  explanation: string;
  totalCount: number;
  /** "ai" = Gemini used, "fallback" = rule-based extraction used */
  source: "ai" | "fallback";
  /** true when results were re-ranked using the logged-in student's profile */
  personalized: boolean;
  /** true when the local transformer embedding model contributed to ranking */
  semantic: boolean;
  /** true when the local cross-encoder re-scored the results */
  reranked: boolean;
}
