/**
 * eventIngestionService.ts
 *
 * Orchestrates the full ingestion pipeline:
 *   Brabble API → normalize → validate → deduplicate → upsert PostgreSQL
 *
 * ── Scoring weights (transparent, not AI) ────────────────────────────────────
 * External events get a base relevanceScore of 65 (slightly below hand-curated
 * seeded data which starts at 70). Featured events get +10.
 *
 * ── Deduplication strategy ───────────────────────────────────────────────────
 * Primary key: source + sourceId (Prisma @@unique constraint)
 * Fallback:    normalised title + organizer slug (when sourceId absent)
 */

import { Category, Mode, Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { fetchAllHubs, type BrabbleEvent } from "./eventApiClient";

// ── Result types ──────────────────────────────────────────────────────────────

export interface IngestionSummary {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  lastSyncAt: string;
}

// ── Category normalization ────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, Category> = {
  // Hackathon variants
  hackathon: Category.HACKATHON,
  hack: Category.HACKATHON,
  "ai hackathon": Category.HACKATHON,
  "tech hackathon": Category.HACKATHON,
  "coding hackathon": Category.HACKATHON,
  hacks: Category.HACKATHON,

  // Competition variants
  competition: Category.COMPETITION,
  "coding competition": Category.COMPETITION,
  "case competition": Category.COMPETITION,
  challenge: Category.COMPETITION,
  contest: Category.COMPETITION,
  olympiad: Category.COMPETITION,
  quiz: Category.COMPETITION,

  // Workshop variants
  workshop: Category.WORKSHOP,
  bootcamp: Category.WORKSHOP,
  "boot camp": Category.WORKSHOP,
  training: Category.WORKSHOP,
  webinar: Category.WORKSHOP,
  seminar: Category.WORKSHOP,
  course: Category.WORKSHOP,

  // Internship variants
  internship: Category.INTERNSHIP,
  intern: Category.INTERNSHIP,
  fellowship: Category.INTERNSHIP,
  apprenticeship: Category.INTERNSHIP,

  // Conference variants
  conference: Category.CONFERENCE,
  summit: Category.CONFERENCE,
  symposium: Category.CONFERENCE,
  expo: Category.CONFERENCE,
  meetup: Category.CONFERENCE,

  // Scholarship variants
  scholarship: Category.SCHOLARSHIP,
  grant: Category.SCHOLARSHIP,
  award: Category.SCHOLARSHIP,
  bursary: Category.SCHOLARSHIP,
};

function normalizeCategory(raw?: string): Category {
  if (!raw) return Category.HACKATHON;
  const lower = raw.toLowerCase().trim();

  // Direct lookup
  if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];

  // Partial match
  for (const [key, cat] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return cat;
  }

  return Category.COMPETITION; // default for unknown
}

// ── Location normalization ────────────────────────────────────────────────────

const LOCATION_MAP: Record<string, string> = {
  "chennai": "Chennai",
  "madras": "Chennai",
  "bangalore": "Bangalore",
  "bengaluru": "Bangalore",
  "hyderabad": "Hyderabad",
  "mumbai": "Mumbai",
  "bombay": "Mumbai",
  "delhi": "Delhi",
  "new delhi": "Delhi",
  "pune": "Pune",
  "kolkata": "Kolkata",
  "calcutta": "Kolkata",
  "ahmedabad": "Ahmedabad",
  "online": "Online",
  "virtual": "Online",
  "remote": "Online",
  "anywhere": "Online",
  "worldwide": "Online",
  "global": "Online",
};

function normalizeLocation(raw?: string, city?: string, country?: string): string {
  const input = (raw ?? city ?? "").toLowerCase().trim();
  if (!input) return "Online";

  for (const [key, value] of Object.entries(LOCATION_MAP)) {
    if (input.includes(key)) return value;
  }

  // Return cleaned version of original (capitalize first letter of each word)
  const cleaned = (raw ?? city ?? "Unknown")
    .split(/[,]+/)[0]  // take first part before comma
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return cleaned || "Other";
}

// ── Mode normalization ────────────────────────────────────────────────────────

function normalizeMode(raw?: string): Mode {
  if (!raw) return Mode.OFFLINE;
  const lower = raw.toLowerCase().trim();
  if (["online", "virtual", "remote", "digital"].includes(lower)) return Mode.ONLINE;
  if (["hybrid", "blended", "mixed"].includes(lower)) return Mode.HYBRID;
  return Mode.OFFLINE;
}

// ── Date parsing ──────────────────────────────────────────────────────────────

function parseDate(raw?: string): Date | null {
  if (!raw) return null;
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

// ── URL validation ────────────────────────────────────────────────────────────

function isValidUrl(url?: string): boolean {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ── Fallback sourceId (when external API doesn't provide one) ─────────────────

function buildFallbackSourceId(event: BrabbleEvent): string {
  const titleSlug = (event.title ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60);
  const orgSlug = (event.organiser ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 30);
  return `${titleSlug}--${orgSlug}`;
}

// ── Normalization ─────────────────────────────────────────────────────────────

type NormalizedOpportunity = Prisma.OpportunityCreateInput & {
  source: string;
  sourceId: string;
};

function normalize(event: BrabbleEvent): NormalizedOpportunity | null {
  // Required: title
  if (!event.title?.trim()) return null;

  const location = normalizeLocation(undefined, event.city, undefined);
  const mode = normalizeMode(event.mode);
  // The live API's one hub ("hackathons") tags every listing type:"HACKATHON" —
  // normalizeCategory already lowercase-matches that directly.
  const category = normalizeCategory(event.type);

  // If mode says Online but location is a city, trust mode
  const finalLocation =
    mode === Mode.ONLINE ? "Online" : location;

  // The API only ever gives a registration deadline, never a separate event
  // start date — using the deadline itself is a more honest default than an
  // arbitrary "7 days from now" guess.
  const registrationDeadline = parseDate(event.deadline) ?? new Date(Date.now() + 7 * 86400_000);
  const startDate = registrationDeadline;

  // URL — `url` is the real listing/registration link; `shareUrl` (a stable
  // brabble.ai redirect) is the fallback if that's ever missing.
  const registrationUrl =
    isValidUrl(event.url)
      ? event.url!
      : isValidUrl(event.shareUrl)
      ? event.shareUrl!
      : "https://brabble.ai";

  const sourceId = event.id?.trim() || buildFallbackSourceId(event);

  // eligibility comes back as a list (e.g. ["Undergraduate", "Engineering
  // Students"]) — join it into the free-text field the rest of the app expects.
  const eligibilityText = Array.isArray(event.eligibility) && event.eligibility.length > 0
    ? event.eligibility.join(", ")
    : "Open to all students";

  // fee is a real, honest signal for isFree — "Free" means free, anything
  // else is a real price string, so it's Paid. Never guessed when absent.
  const isFree = typeof event.fee === "string"
    ? event.fee.trim().toLowerCase() === "free"
    : undefined;

  const tags = [event.platform, event.prize?.label].filter((t): t is string => !!t && t.trim().length > 0);

  return {
    title: event.title.trim().slice(0, 255),
    description: `${event.title.trim()} — discover this opportunity on CampusFind AI.`.slice(0, 2000),
    category,
    location: finalLocation,
    mode,
    startDate,
    registrationDeadline,
    organizer: (event.organiser?.trim() || "External Organizer").slice(0, 200),
    eligibility: eligibilityText.slice(0, 500),
    skills: [],
    tags: tags.slice(0, 20),
    registrationUrl,
    relevanceScore: 65,  // base score for external events
    featured: false,
    isFree,
    source: "brabble",
    sourceId,
    externalUpdatedAt: null, // API doesn't provide a last-updated timestamp
  };
}

// ── Validation ────────────────────────────────────────────────────────────────

function validate(opp: NormalizedOpportunity): string | null {
  if (!opp.title) return "missing title";
  if (!opp.sourceId) return "missing sourceId";
  if (opp.startDate instanceof Date && isNaN(opp.startDate.getTime())) return "invalid startDate";
  if (opp.registrationDeadline instanceof Date && isNaN((opp.registrationDeadline as Date).getTime())) return "invalid registrationDeadline";
  return null; // valid
}

// ── Upsert single opportunity ─────────────────────────────────────────────────

async function upsertOpportunity(opp: NormalizedOpportunity): Promise<"created" | "updated"> {
  const existing = await prisma.opportunity.findFirst({
    where: { source: opp.source, sourceId: opp.sourceId },
    select: { id: true },
  });

  if (existing) {
    await prisma.opportunity.update({
      where: { id: existing.id },
      data: {
        title: opp.title,
        description: opp.description,
        category: opp.category,
        location: opp.location,
        mode: opp.mode,
        startDate: opp.startDate as Date,
        endDate: opp.endDate as Date | undefined,
        registrationDeadline: opp.registrationDeadline as Date,
        organizer: opp.organizer,
        eligibility: opp.eligibility,
        skills: opp.skills as string[],
        tags: opp.tags as string[],
        registrationUrl: opp.registrationUrl,
        isFree: opp.isFree as boolean | undefined,
        externalUpdatedAt: opp.externalUpdatedAt,
      },
    });
    return "updated";
  }

  await prisma.opportunity.create({ data: opp as Prisma.OpportunityCreateInput });
  return "created";
}

// ── Main ingestion function ───────────────────────────────────────────────────

export async function runIngestion(): Promise<IngestionSummary> {
  const summary: IngestionSummary = {
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    lastSyncAt: new Date().toISOString(),
  };

  // 1. Fetch from external API
  let rawEvents: BrabbleEvent[];
  try {
    rawEvents = await fetchAllHubs();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`External API fetch failed: ${msg}`);
  }

  summary.fetched = rawEvents.length;
  console.log(`[ingestion] Fetched ${rawEvents.length} raw events from Brabble`);

  // 2. Process each event
  for (const event of rawEvents) {
    try {
      // Normalize
      const normalized = normalize(event);
      if (!normalized) {
        console.warn(`[ingestion] Skipped (normalize returned null): ${event.id ?? "no-id"}`);
        summary.skipped++;
        continue;
      }

      // Validate
      const validationError = validate(normalized);
      if (validationError) {
        console.warn(`[ingestion] Skipped (${validationError}): "${event.title}"`);
        summary.skipped++;
        continue;
      }

      // Upsert
      const result = await upsertOpportunity(normalized);
      if (result === "created") summary.created++;
      else summary.updated++;

    } catch (err) {
      summary.errors++;
      // Log but do NOT crash the loop — one bad record should not stop ingestion
      console.error(`[ingestion] Error processing event "${event.title ?? event.id}":`, err);
    }
  }

  console.log(`[ingestion] Done — created: ${summary.created}, updated: ${summary.updated}, skipped: ${summary.skipped}, errors: ${summary.errors}`);

  return summary;
}

// ── Stats helper ──────────────────────────────────────────────────────────────

export async function getIngestionStats() {
  const [total, external] = await Promise.all([
    prisma.opportunity.count(),
    prisma.opportunity.count({ where: { source: { not: null } } }),
  ]);

  const lastExternal = await prisma.opportunity.findFirst({
    where: { source: { not: null } },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true, source: true },
  });

  return {
    totalOpportunities: total,
    externalOpportunities: external,
    manualOpportunities: total - external,
    lastSyncAt: lastExternal?.updatedAt?.toISOString() ?? null,
    source: lastExternal?.source ?? null,
  };
}
