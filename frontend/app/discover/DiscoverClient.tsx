"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import OpportunityCard from "@/components/OpportunityCard";
import FilterPanel from "@/components/discover/FilterPanel";
import CardSkeleton from "@/components/discover/CardSkeleton";
import { OPPORTUNITIES } from "@/lib/mockData";
import { fetchOpportunities, aiSearch } from "@/lib/api";
import type { AiSearchResponse } from "@/lib/api";
import { adaptApiOpportunities } from "@/lib/adapt";
import type { Opportunity } from "@/lib/mockData";
import {
  type FilterState,
  type SortOption,
  DEFAULT_FILTERS,
  filterOpportunities,
  sortOpportunities,
  hasActiveFilters,
  activeFilterCount,
  toStructuredFilters,
  filtersToSearchParams,
  searchParamsToFilters,
  getFilterChips,
} from "@/lib/filters";

// ── Helpers ────────────────────────────────────────────────────────────────────

function adaptAiResults(results: AiSearchResponse["results"]): Opportunity[] {
  const CAT_MAP: Record<string, Opportunity["category"]> = {
    HACKATHON: "hackathon",
    INTERNSHIP: "internship",
    WORKSHOP: "workshop",
    COMPETITION: "competition",
    CONFERENCE: "conference",
    SCHOLARSHIP: "scholarship",
  };
  const MODE_MAP: Record<string, Opportunity["mode"]> = {
    ONLINE: "online",
    OFFLINE: "offline",
    HYBRID: "hybrid",
  };
  return results.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: (CAT_MAP[r.category] ?? "hackathon") as Opportunity["category"],
    location: r.location,
    mode: (MODE_MAP[r.mode] ?? "offline") as Opportunity["mode"],
    startDate: r.startDate.slice(0, 10),
    endDate: r.endDate ? r.endDate.slice(0, 10) : undefined,
    registrationDeadline: r.registrationDeadline.slice(0, 10),
    organizer: r.organizer,
    eligibility: r.eligibility,
    tags: r.tags,
    featured: r.featured,
    relevanceScore: Math.min(Math.max(Math.round(r._searchScore), 0), 100),
  }));
}

const TIME_RANGE_LABELS: Record<string, string> = {
  this_week: "This week",
  this_month: "This month",
  next_month: "Next month",
  this_year: "This year",
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "relevant", label: "Most relevant" },
  { value: "deadline", label: "Deadline soon" },
  { value: "newest", label: "Newest" },
  { value: "ai_match", label: "Highest AI Match" },
];

// One-tap shortcuts for the most common refinements — each just toggles the
// same `filters` state the full FilterPanel already drives, so there's a
// single source of truth for "what's currently filtered".
const QUICK_FILTERS: {
  label: string;
  active: (f: FilterState) => boolean;
  toggle: (f: FilterState) => FilterState;
}[] = [
  {
    label: "Hackathons",
    active: (f) => f.categories.includes("hackathon"),
    toggle: (f) => ({
      ...f,
      categories: f.categories.includes("hackathon") ? f.categories.filter((c) => c !== "hackathon") : [...f.categories, "hackathon"],
    }),
  },
  {
    label: "Internships",
    active: (f) => f.categories.includes("internship"),
    toggle: (f) => ({
      ...f,
      categories: f.categories.includes("internship") ? f.categories.filter((c) => c !== "internship") : [...f.categories, "internship"],
    }),
  },
  {
    label: "AI",
    active: (f) => f.domain === "AI",
    toggle: (f) => ({ ...f, domain: f.domain === "AI" ? "" : "AI" }),
  },
  {
    label: "Remote",
    active: (f) => f.modes.includes("online"),
    toggle: (f) => ({
      ...f,
      modes: f.modes.includes("online") ? f.modes.filter((m) => m !== "online") : [...f.modes, "online"],
    }),
  },
];

// ── AI Status Banner ───────────────────────────────────────────────────────────

type SearchStatus =
  | { type: "idle" }
  | { type: "understanding" }
  | { type: "searching" }
  | { type: "done"; response: AiSearchResponse }
  | { type: "error"; message: string }
  | { type: "no_results" };

function IntentChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full border ${color}`}
    >
      <span className="opacity-60">{label}:</span> {value}
    </span>
  );
}

function AIBanner({
  status,
  onRetry,
}: {
  status: SearchStatus;
  onRetry?: () => void;
}) {
  if (status.type === "idle") return null;

  if (status.type === "understanding") {
    return (
      <div className="mt-3 flex items-center gap-2 text-[13px] text-slate-600">
        <svg
          className="w-4 h-4 animate-spin text-indigo-500"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-20"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8z"
          />
        </svg>
        <span className="font-medium text-slate-500">
          Understanding your request…
        </span>
      </div>
    );
  }

  if (status.type === "searching") {
    return (
      <div className="mt-3 flex items-center gap-2 text-[13px]">
        <svg
          className="w-4 h-4 animate-spin text-indigo-500"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-20"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8z"
          />
        </svg>
        <span className="font-medium text-slate-500">
          Finding matching opportunities…
        </span>
      </div>
    );
  }

  if (status.type === "error") {
    return (
      <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl">
        <svg
          className="w-4 h-4 text-rose-500 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <span className="text-[13px] text-rose-700 flex-1">
          {status.message}
        </span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-[12px] font-semibold text-rose-700 hover:text-rose-900 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (status.type === "done") {
    const { response } = status;
    const { intent } = response;

    const chips: { label: string; value: string; color: string }[] = [];
    if (intent.category) {
      chips.push({
        label: "Category",
        value:
          intent.category.charAt(0) +
          intent.category.slice(1).toLowerCase() +
          (intent.category !== "INTERNSHIP" ? " 🏆" : " 💼"),
        color: "bg-indigo-50 text-indigo-700 border-indigo-100",
      });
    }
    if (intent.skills.length > 0) {
      chips.push({
        label: "Focus",
        value: intent.skills.slice(0, 2).join(", "),
        color: "bg-violet-50 text-violet-700 border-violet-100",
      });
    }
    if (intent.location) {
      chips.push({
        label: "Location",
        value: intent.location + " 📍",
        color: "bg-sky-50 text-sky-700 border-sky-100",
      });
    }
    if (intent.mode) {
      chips.push({
        label: "Mode",
        value:
          intent.mode.charAt(0) + intent.mode.slice(1).toLowerCase(),
        color: "bg-teal-50 text-teal-700 border-teal-100",
      });
    }
    if (intent.studentType) {
      chips.push({
        label: "Student",
        value: intent.studentType + " 🎓",
        color: "bg-violet-50 text-violet-700 border-violet-100",
      });
    }
    if (intent.timeRange) {
      chips.push({
        label: "Time",
        value: TIME_RANGE_LABELS[intent.timeRange] ?? intent.timeRange,
        color: "bg-amber-50 text-amber-700 border-amber-100",
      });
    }

    return (
      <div className="mt-3 rounded-xl border border-violet-100 p-3.5 space-y-2.5" style={{ background: "var(--ai-gradient-soft)" }}>
        {/* "Here's what I understood" header */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-[12px] font-bold text-violet-700 flex-shrink-0">
            <svg
              className="w-3.5 h-3.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Here&rsquo;s what I understood
          </span>
          {response.source === "ai" && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-white text-indigo-700 rounded-full border border-indigo-100">
              Gemini
            </span>
          )}
          {response.personalized && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold bg-white text-violet-700 rounded-full border border-violet-100">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              Personalized for you
            </span>
          )}
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <IntentChip
                key={c.label}
                label={c.label}
                value={c.value}
                color={c.color}
              />
            ))}
          </div>
        )}

        {/* AI explanation */}
        <div className="flex items-start gap-2 px-3.5 py-2.5 bg-white/70 border border-white rounded-xl">
          <svg
            className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
            />
          </svg>
          <p className="text-[13px] text-slate-600 leading-relaxed">
            {response.explanation}
          </p>
        </div>
      </div>
    );
  }

  return null;
}

// ── Main component ─────────────────────────────────────────────────────────────

// Generous single-page cap for browse mode — there's no "load more" UI yet,
// so we fetch a large-but-bounded page rather than paginate. Filtering
// itself always happens in Postgres (via fetchOpportunities' query params),
// never on an unfiltered client-side slice, regardless of this cap.
const BROWSE_LIMIT = 60;

export default function DiscoverClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parsed once at mount (and on a hard page refresh) — this is what makes
  // "refreshing the page preserves the search" work without a live two-way
  // sync between URL and filter state (which would risk update loops).
  const initialState = useMemo(() => searchParamsToFilters(searchParams), []); // eslint-disable-line react-hooks/exhaustive-deps
  const initialQuery = initialState.query;

  const [inputValue, setInputValue] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<FilterState>(initialState.filters);
  const [sort, setSort] = useState<SortOption>(initialState.sort);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // AI search state
  const [searchStatus, setSearchStatus] = useState<SearchStatus>({ type: "idle" });
  const [aiResults, setAiResults] = useState<Opportunity[] | null>(null);

  // Normal browse state — total/matchScores come straight from the backend,
  // which applies category/location/domain/etc. filters in Postgres so the
  // count and result set stay correct however large the table grows.
  const [browseOpps, setBrowseOpps] = useState<Opportunity[] | null>(null);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [matchScores, setMatchScores] = useState<Record<string, number>>({});
  const [browseLoading, setBrowseLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"api" | "mock">("mock");

  const abortRef = useRef<AbortController | null>(null);

  // ── Load browse data (backend-filtered, sorted, and counted) ──────────────

  const loadBrowseData = useCallback(async (f: FilterState, s: SortOption) => {
    setBrowseLoading(true);
    try {
      const res = await fetchOpportunities({
        ...toStructuredFilters(f),
        sort: s,
        limit: BROWSE_LIMIT,
      });
      if (res) {
        setBrowseOpps(adaptApiOpportunities(res.data));
        setBrowseTotal(res.meta.total);
        setMatchScores(res.matchScores ?? {});
        setDataSource("api");
      } else {
        // Backend unreachable — fall back to the small bundled mock dataset,
        // filtered/sorted client-side (bounded, not a "large result set").
        setBrowseOpps(null);
        setBrowseTotal(0);
        setMatchScores({});
        setDataSource("mock");
      }
    } catch {
      setBrowseOpps(null);
      setBrowseTotal(0);
      setMatchScores({});
      setDataSource("mock");
    } finally {
      setBrowseLoading(false);
    }
  }, []);

  // ── AI Search ──────────────────────────────────────────────────────────────

  const runAiSearch = useCallback(
    async (q: string, f: FilterState) => {
      if (!q.trim()) {
        setSearchStatus({ type: "idle" });
        setAiResults(null);
        return;
      }

      // Cancel any previous in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      // Step 1: Understanding phase (visible immediately)
      setSearchStatus({ type: "understanding" });
      setAiResults(null);

      // Brief pause so users see the "understanding" state
      await new Promise((r) => setTimeout(r, 600));

      // Step 2: Searching phase
      setSearchStatus({ type: "searching" });

      try {
        // Explicit sidebar filters (if any) take priority over the LLM's guess
        const response = await aiSearch(q, toStructuredFilters(f));

        if (!response) {
          setSearchStatus({
            type: "error",
            message:
              "Search is temporarily unavailable. Please try again in a moment.",
          });
          return;
        }

        if (response.totalCount === 0) {
          setSearchStatus({ type: "done", response });
          setAiResults([]);
          return;
        }

        setSearchStatus({ type: "done", response });
        setAiResults(adaptAiResults(response.results));
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setSearchStatus({
          type: "error",
          message: "Something went wrong. Please check your connection and retry.",
        });
      }
    },
    []
  );

  // Latest filters, readable from effects that intentionally don't list
  // `filters` as a dependency (so they don't re-fire on every filter click).
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // ── Effects ────────────────────────────────────────────────────────────────

  // Initial mount — data was already seeded from the URL via initialState
  // above, so this just kicks off the first fetch(es).
  useEffect(() => {
    loadBrowseData(filters, sort);
    if (initialQuery) {
      runAiSearch(initialQuery, filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External query changes (Navbar search while already on /discover,
  // browser back/forward between searches) — re-runs AI search with
  // whatever filters are currently selected.
  const skippedFirstUrlSync = useRef(false);
  useEffect(() => {
    if (!skippedFirstUrlSync.current) {
      skippedFirstUrlSync.current = true;
      return;
    }
    const q = searchParams.get("q") ?? "";
    setInputValue(q);
    setQuery(q);
    if (q) {
      runAiSearch(q, filtersRef.current);
    } else {
      setSearchStatus({ type: "idle" });
      setAiResults(null);
      loadBrowseData(filtersRef.current, sort);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Filter/sort changes — refetch from the backend and mirror the new
  // selection into the URL so a page refresh preserves it.
  const skippedFirstFilterRun = useRef(false);
  useEffect(() => {
    if (!skippedFirstFilterRun.current) {
      skippedFirstFilterRun.current = true;
      return;
    }
    const params = filtersToSearchParams(filters, sort, query);
    router.replace(params.toString() ? `/discover?${params.toString()}` : "/discover", {
      scroll: false,
    });
    if (query.trim()) {
      runAiSearch(query, filters);
    } else {
      loadBrowseData(filters, sort);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sort]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSearch = () => {
    const q = inputValue.trim();
    setQuery(q);
    const params = filtersToSearchParams(filters, sort, q);
    router.push(params.toString() ? `/discover?${params.toString()}` : "/discover");
  };

  const handleClearQuery = () => {
    setInputValue("");
    setQuery("");
    setSearchStatus({ type: "idle" });
    setAiResults(null);
    // Browse data may be stale if filters changed while an AI search was active
    loadBrowseData(filters, sort);
    const params = filtersToSearchParams(filters, sort, "");
    router.push(params.toString() ? `/discover?${params.toString()}` : "/discover");
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    handleClearQuery();
  };

  // ── Computed results ───────────────────────────────────────────────────────

  const isAiMode = query.trim().length > 0;
  const isLoading =
    browseLoading ||
    searchStatus.type === "understanding" ||
    searchStatus.type === "searching";

  // AI mode: the backend already applied category/location/domain/etc.
  // filters and ranked the (bounded) result set — only re-sort that batch
  // client-side, never re-filter it. Browse mode (live backend): the
  // backend already filtered, sorted, and paginated this page directly —
  // display it as-is. Only the small bundled mock fallback (backend
  // unreachable) is still filtered/sorted client-side, since it's a fixed,
  // bounded 14-item list rather than the full database.
  const displayResults = useMemo(() => {
    if (isAiMode) {
      if (aiResults === null) return [];
      return sortOpportunities(aiResults, sort);
    }
    if (dataSource === "mock") {
      return sortOpportunities(filterOpportunities(OPPORTUNITIES, filters, ""), sort);
    }
    const page = browseOpps ?? [];
    if (sort === "ai_match" && Object.keys(matchScores).length > 0) {
      return page.map((o) => ({ ...o, relevanceScore: matchScores[o.id] ?? o.relevanceScore }));
    }
    return page;
  }, [isAiMode, aiResults, dataSource, browseOpps, matchScores, filters, sort]);

  // True match count for the "N opportunities found" header — comes straight
  // from the backend (accurate across the whole filtered table), not just
  // the length of whatever page happens to be rendered.
  const resultCount = isAiMode || dataSource === "mock" ? displayResults.length : browseTotal;
  const isPartialPage = !isAiMode && dataSource === "api" && browseTotal > displayResults.length;

  const filterCount = activeFilterCount(filters);

  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* ══ Sticky search bar ════════════════════════════════════════════════════ */}
      <div className="bg-white border-b border-slate-100 px-4 sm:px-6 py-4 sticky top-16 z-30">
        <div className="max-w-6xl mx-auto">

          {/* Search input — gradient ring on focus, the AI signature moment */}
          <div className={`relative rounded-xl transition-all ${searchFocused ? "p-[1.5px]" : "p-0"}`} style={searchFocused ? { background: "var(--ai-gradient)" } : undefined}>
            <div className={`flex items-center gap-3 rounded-xl px-4 py-3 bg-white transition-all ${searchFocused ? "shadow-md shadow-violet-100" : "border border-slate-200 shadow-sm"}`}>
              <svg
                className={`w-4 h-4 flex-shrink-0 transition-colors ${searchFocused ? "text-violet-500" : "text-slate-400"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <input
                id="discover-search"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder='Find your next opportunity — try "AI hackathons in Chennai this month"'
                className="flex-1 text-[14px] text-slate-800 placeholder-slate-400 bg-transparent outline-none"
                aria-label="Search opportunities with AI"
                autoComplete="off"
              />
              {inputValue && (
                <button
                  aria-label="Clear search"
                  onClick={handleClearQuery}
                  className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
              <button
                id="discover-search-btn"
                onClick={handleSearch}
                disabled={
                  searchStatus.type === "understanding" ||
                  searchStatus.type === "searching"
                }
                className="flex-shrink-0 px-5 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-transform active:scale-95"
                style={{ background: "var(--ai-gradient)" }}
              >
                {searchStatus.type === "understanding" ||
                searchStatus.type === "searching" ? (
                  <span className="flex items-center gap-1.5">
                    <svg
                      className="w-3.5 h-3.5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-20"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    Searching
                  </span>
                ) : (
                  "Search"
                )}
              </button>
            </div>
          </div>

          {/* Quick filters — one tap toward the most common refinements */}
          {!isAiMode && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {QUICK_FILTERS.map(({ label, active, toggle }) => {
                const isActive = active(filters);
                return (
                  <button
                    key={label}
                    onClick={() => setFilters(toggle(filters))}
                    className={`px-3 py-1.5 text-[12.5px] font-semibold rounded-full border transition-colors ${
                      isActive
                        ? "bg-violet-600 border-violet-600 text-white shadow-sm shadow-violet-200"
                        : "bg-white border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* AI banner (understanding → chips → explanation) */}
          <AIBanner
            status={searchStatus}
            onRetry={() => runAiSearch(query, filters)}
          />

          {/* Data source indicator (browse mode only) */}
          {!isAiMode && !browseLoading && (
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  dataSource === "api" ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <span className="text-[11px] text-slate-400">
                {dataSource === "api"
                  ? "Live data from database"
                  : "Using demo data (backend unavailable)"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ══ Main content ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6 items-start">

          {/* ── Desktop sidebar ── */}
          <aside className="hidden lg:block w-52 flex-shrink-0">
            <div className="sticky top-36 bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
              <FilterPanel filters={filters} onChange={setFilters} />
            </div>
          </aside>

          {/* ── Results area ── */}
          <section className="flex-1 min-w-0">

            {/* Results header */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5 min-w-0">

                {/* Mobile filter button */}
                <button
                  id="mobile-filter-btn"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex-shrink-0"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0h9.75"
                    />
                  </svg>
                  Filters
                  {filterCount > 0 && (
                    <span className="ml-0.5 w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {filterCount}
                    </span>
                  )}
                </button>

                {/* Result count */}
                <p className="text-[14px] text-slate-500 truncate">
                  {isLoading ? (
                    <span className="text-slate-400">
                      {searchStatus.type === "understanding"
                        ? "Understanding your request…"
                        : searchStatus.type === "searching"
                        ? "Searching opportunities…"
                        : "Loading…"}
                    </span>
                  ) : (
                    <>
                      <span className="font-extrabold text-slate-900 text-[15px]">
                        {resultCount}
                      </span>{" "}
                      opportunit{resultCount !== 1 ? "ies" : "y"}{" "}
                      {isAiMode ? "matched" : "found"}
                      {isPartialPage && (
                        <span className="text-slate-400"> (showing {displayResults.length})</span>
                      )}
                      {hasActiveFilters(filters) && (
                        <button
                          onClick={() => setFilters(DEFAULT_FILTERS)}
                          className="ml-2 text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                        >
                          Clear filters
                        </button>
                      )}
                    </>
                  )}
                </p>
              </div>

              {/* Sort */}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="text-[13px] font-medium text-slate-600 border border-slate-200 rounded-lg px-3 py-2 bg-white hover:border-slate-300 focus:outline-none focus:border-indigo-400 transition-colors flex-shrink-0 cursor-pointer"
                aria-label="Sort opportunities"
              >
                {SORT_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected filter chips — visible on all sizes, most useful on mobile
                where the sidebar is hidden behind the filter drawer */}
            {filterCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-4 lg:hidden">
                {getFilterChips(filters).map((chip) => (
                  <button
                    key={chip.key}
                    onClick={() => setFilters(chip.remove(filters))}
                    className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full hover:bg-indigo-100 transition-colors"
                  >
                    {chip.label}
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ))}
                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-700 px-1.5 py-1 transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Cards / Skeletons / Empty state */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : displayResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {displayResults.map((opp) => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    showRelevance={isAiMode || sort === "ai_match"}
                  />
                ))}
              </div>
            ) : searchStatus.type === "error" ? null : (
              <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in-up">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--ai-gradient-soft)" }}>
                  {isAiMode ? (
                    <svg
                      className="w-6 h-6 text-violet-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.8}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-6 h-6 text-violet-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.8}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
                      />
                    </svg>
                  )}
                </div>
                <h2 className="text-[17px] font-bold text-slate-800 mb-1">
                  No opportunities found
                </h2>
                <p className="text-[13px] text-slate-400 mb-6 max-w-xs">
                  Try changing your search or filters.
                </p>
                <button
                  onClick={handleReset}
                  className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md shadow-violet-200 transition-transform active:scale-95"
                  style={{ background: "var(--ai-gradient)" }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ══ Mobile filter drawer ════════════════════════════════════════════════ */}
      {mobileFiltersOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            aria-hidden="true"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Filters"
            className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[85dvh] overflow-y-auto lg:hidden"
          >
            <div className="px-4 pt-3 pb-6">
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-semibold text-slate-900">Filters</h2>
                <button
                  aria-label="Close filters"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <FilterPanel filters={filters} onChange={setFilters} />
              <div className="mt-5 pt-4 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Clear all
                </button>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="flex-[2] py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Show {displayResults.length} results
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
