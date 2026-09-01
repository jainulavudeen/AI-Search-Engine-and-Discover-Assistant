import type { Category, Mode, Opportunity } from "./mockData";
import { CATEGORY_LABELS, MODE_LABELS } from "./mockData";
import type { StructuredOpportunityFilters } from "./api";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FilterState {
  categories: Category[];
  locations: string[];
  eligibility: string[];
  date: string; // "" | "today" | "week" | "month" | "next_month"
  modes: Mode[];
  domain: string; // "" | "AI" | "Machine Learning" | ... | "Other"
  registration: string; // "" | "free" | "paid"
}

export const DEFAULT_FILTERS: FilterState = {
  categories: [],
  locations: [],
  eligibility: [],
  date: "",
  modes: [],
  domain: "",
  registration: "",
};

export type SortOption = "relevant" | "deadline" | "newest" | "ai_match";

// ── Backend request mapping ───────────────────────────────────────────────────
// The backend accepts a single value or a comma-separated list per field
// (buildOpportunityWhere splits and OR's them), so multi-select checkboxes
// for category/location/mode/eligibility are sent through in full — nothing
// is dropped when more than one box is checked.
export function toStructuredFilters(filters: FilterState): StructuredOpportunityFilters {
  const f: StructuredOpportunityFilters = {};
  if (filters.categories.length) f.category = filters.categories.join(",");
  const locations = filters.locations.filter((l) => l !== "Other");
  if (locations.length) f.location = locations.join(",");
  if (filters.modes.length) f.mode = filters.modes.join(",");
  if (filters.eligibility.length) f.eligibility = filters.eligibility.join(",");
  if (filters.date) f.date = filters.date;
  if (filters.domain && filters.domain !== "Other") f.domain = filters.domain;
  if (filters.registration) f.registration = filters.registration;
  return f;
}

// ── URL state (?q=&category=&location=&mode=&eligibility=&date=&domain=&registration=&sort=) ──

const CATEGORY_VALUES: Category[] = ["hackathon", "internship", "workshop", "competition", "conference", "scholarship"];
const MODE_VALUES: Mode[] = ["online", "offline", "hybrid"];

export function filtersToSearchParams(
  filters: FilterState,
  sort: SortOption,
  query: string
): URLSearchParams {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (filters.categories.length) params.set("category", filters.categories.join(","));
  if (filters.locations.length) params.set("location", filters.locations.join(","));
  if (filters.modes.length) params.set("mode", filters.modes.join(","));
  if (filters.eligibility.length) params.set("eligibility", filters.eligibility.join(","));
  if (filters.date) params.set("date", filters.date);
  if (filters.domain) params.set("domain", filters.domain);
  if (filters.registration) params.set("registration", filters.registration);
  if (sort !== "relevant") params.set("sort", sort);
  return params;
}

export function searchParamsToFilters(params: URLSearchParams): {
  filters: FilterState;
  sort: SortOption;
  query: string;
} {
  const categories = (params.get("category") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter((c): c is Category => CATEGORY_VALUES.includes(c as Category));
  const modes = (params.get("mode") ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter((m): m is Mode => MODE_VALUES.includes(m as Mode));
  const locations = (params.get("location") ?? "").split(",").map((l) => l.trim()).filter(Boolean);
  const eligibility = (params.get("eligibility") ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  const sort = params.get("sort") as SortOption | null;

  return {
    query: params.get("q") ?? "",
    sort: sort && ["relevant", "deadline", "newest", "ai_match"].includes(sort) ? sort : "relevant",
    filters: {
      categories,
      locations,
      eligibility,
      date: params.get("date") ?? "",
      modes,
      domain: params.get("domain") ?? "",
      registration: params.get("registration") ?? "",
    },
  };
}

export interface QueryIntent {
  categories: string[];
  locations: string[];
  studentTypes: string[];
  timeframe: string | null;
}

// ── AI intent extraction ───────────────────────────────────────────────────────

export function extractIntent(query: string): QueryIntent {
  const q = query.toLowerCase();
  const categories: string[] = [];
  const locations: string[] = [];
  const studentTypes: string[] = [];
  let timeframe: string | null = null;

  // Category detection
  const isAI = /\bai\b|\bml\b|machine learning|artificial intelligence/.test(q);
  if (/hackathon/.test(q)) categories.push(isAI ? "AI Hackathon" : "Hackathon");
  if (/intern/.test(q)) categories.push("Internship");
  if (/workshop/.test(q)) categories.push("Workshop");
  if (/competition|challenge/.test(q)) categories.push("Competition");
  if (/conference|summit|devfest/.test(q)) categories.push("Conference");
  if (/scholarship/.test(q)) categories.push("Scholarship");
  if (categories.length === 0 && isAI) categories.push("AI/ML");

  // Location detection
  if (/chennai/.test(q)) locations.push("Chennai");
  if (/bangalore|bengaluru/.test(q)) locations.push("Bangalore");
  if (/hyderabad/.test(q)) locations.push("Hyderabad");
  if (/online|remote|virtual/.test(q)) locations.push("Online");

  // Student type detection
  if (/engineering|engineer/.test(q)) studentTypes.push("Engineering");
  if (/undergrad/.test(q)) studentTypes.push("Undergraduate");
  if (/postgrad|master|mtech|mba/.test(q)) studentTypes.push("Postgraduate");

  // Timeframe detection
  if (/\btoday\b/.test(q)) timeframe = "Today";
  else if (/this week/.test(q)) timeframe = "This week";
  else if (/this month/.test(q)) timeframe = "This month";
  else if (/upcoming|next month/.test(q)) timeframe = "Upcoming";

  return { categories, locations, studentTypes, timeframe };
}

// ── Filter logic ───────────────────────────────────────────────────────────────

export function filterOpportunities(
  opportunities: Opportunity[],
  filters: FilterState,
  query: string
): Opportunity[] {
  return opportunities.filter((o) => {
    // Text search
    if (query.trim()) {
      const blob = [o.title, o.organizer, o.location, o.description, o.eligibility, ...o.tags]
        .join(" ")
        .toLowerCase();
      if (!blob.includes(query.toLowerCase())) return false;
    }

    // Category
    if (filters.categories.length > 0 && !filters.categories.includes(o.category)) return false;

    // Location
    if (filters.locations.length > 0) {
      const matched = filters.locations.some((loc) =>
        loc === "Online" ? o.mode === "online" : o.location.toLowerCase().includes(loc.toLowerCase())
      );
      if (!matched) return false;
    }

    // Eligibility (partial match)
    if (filters.eligibility.length > 0) {
      const matched = filters.eligibility.some((e) =>
        o.eligibility.toLowerCase().includes(e.toLowerCase())
      );
      if (!matched) return false;
    }

    // Mode
    if (filters.modes.length > 0 && !filters.modes.includes(o.mode)) return false;

    // Date range
    if (filters.date) {
      const now = new Date();
      const start = new Date(o.startDate);
      const diffDays = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      switch (filters.date) {
        case "today":
          if (diffDays < 0 || diffDays > 1) return false;
          break;
        case "week":
          if (diffDays < 0 || diffDays > 7) return false;
          break;
        case "month":
          if (diffDays < 0 || diffDays > 30) return false;
          break;
        case "next_month": {
          const rangeStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
          if (start < rangeStart || start > rangeEnd) return false;
          break;
        }
        case "upcoming":
          if (diffDays < 0) return false;
          break;
      }
    }

    // Domain (keyword match against title/description/tags — mock data has
    // no structured domain field, so this stays a best-effort text search)
    if (filters.domain && filters.domain !== "Other") {
      const blob = [o.title, o.description, ...o.tags].join(" ").toLowerCase();
      if (!blob.includes(filters.domain.toLowerCase())) return false;
    }

    return true;
  });
}

// ── Sort logic ─────────────────────────────────────────────────────────────────

export function sortOpportunities(
  opportunities: Opportunity[],
  sort: SortOption
): Opportunity[] {
  return [...opportunities].sort((a, b) => {
    switch (sort) {
      case "deadline":
        return (
          new Date(a.registrationDeadline).getTime() -
          new Date(b.registrationDeadline).getTime()
        );
      case "newest":
        return parseInt(b.id) - parseInt(a.id);
      case "relevant":
      default:
        return b.relevanceScore - a.relevanceScore;
    }
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

export function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.categories.length > 0 ||
    filters.locations.length > 0 ||
    filters.eligibility.length > 0 ||
    filters.date !== "" ||
    filters.modes.length > 0 ||
    filters.domain !== "" ||
    filters.registration !== ""
  );
}

export function activeFilterCount(filters: FilterState): number {
  return (
    filters.categories.length +
    filters.locations.length +
    filters.eligibility.length +
    (filters.date ? 1 : 0) +
    filters.modes.length +
    (filters.domain ? 1 : 0) +
    (filters.registration ? 1 : 0)
  );
}

const DATE_CHIP_LABELS: Record<string, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  next_month: "Next month",
  upcoming: "Upcoming",
};

export interface FilterChip {
  key: string;
  label: string;
  remove: (filters: FilterState) => FilterState;
}

/** One removable chip per selected filter value — used for the mobile chip row. */
export function getFilterChips(filters: FilterState): FilterChip[] {
  const chips: FilterChip[] = [];

  for (const c of filters.categories) {
    chips.push({
      key: `category:${c}`,
      label: CATEGORY_LABELS[c],
      remove: (f) => ({ ...f, categories: f.categories.filter((x) => x !== c) }),
    });
  }
  for (const loc of filters.locations) {
    chips.push({
      key: `location:${loc}`,
      label: loc,
      remove: (f) => ({ ...f, locations: f.locations.filter((x) => x !== loc) }),
    });
  }
  for (const e of filters.eligibility) {
    chips.push({
      key: `eligibility:${e}`,
      label: e,
      remove: (f) => ({ ...f, eligibility: f.eligibility.filter((x) => x !== e) }),
    });
  }
  for (const m of filters.modes) {
    chips.push({
      key: `mode:${m}`,
      label: MODE_LABELS[m],
      remove: (f) => ({ ...f, modes: f.modes.filter((x) => x !== m) }),
    });
  }
  if (filters.date) {
    chips.push({
      key: "date",
      label: DATE_CHIP_LABELS[filters.date] ?? filters.date,
      remove: (f) => ({ ...f, date: "" }),
    });
  }
  if (filters.domain) {
    chips.push({
      key: "domain",
      label: filters.domain,
      remove: (f) => ({ ...f, domain: "" }),
    });
  }
  if (filters.registration) {
    chips.push({
      key: "registration",
      label: filters.registration === "free" ? "Free" : "Paid",
      remove: (f) => ({ ...f, registration: "" }),
    });
  }

  return chips;
}
