/**
 * eventApiClient.ts
 *
 * Low-level HTTP client for the Brabble AI Listings API.
 * https://brabble.ai/api/listings
 *
 * Responsibilities:
 *  - Handle authentication (Bearer token via BRABBLE_API_KEY env var)
 *  - Handle pagination (offset/limit)
 *  - Handle HTTP errors and timeouts
 *  - Return raw, typed BrabbleEvent[]
 *
 * This module NEVER runs on the frontend. All requests are server-to-server.
 * The API key lives only in backend/.env and is never sent to the client.
 */

// ── Types returned by the Brabble API ────────────────────────────────────────

export interface BrabbleEvent {
  id: string;
  title: string;
  description?: string;
  category?: string;
  hub?: string;         // e.g. "hackathons", "competitions"
  organizer?: string;
  location?: string;
  city?: string;
  country?: string;
  mode?: string;        // "online" | "offline" | "hybrid" | "virtual" | "in-person"
  startDate?: string;
  endDate?: string;
  deadline?: string;    // registration deadline
  registrationUrl?: string;
  url?: string;         // fallback URL
  tags?: string[];
  skills?: string[];
  prize?: string;
  eligibility?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface BrabblePage {
  data: BrabbleEvent[];
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
}

// ── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = process.env.BRABBLE_API_BASE_URL ?? "https://brabble.ai/api";
const API_KEY = process.env.BRABBLE_API_KEY ?? "";
const MAX_PAGES = Math.min(
  parseInt(process.env.EVENT_API_MAX_PAGES ?? "5", 10),
  20  // hard cap — never more than 20 pages regardless of env
);
const PAGE_SIZE = parseInt(process.env.EVENT_API_PAGE_SIZE ?? "50", 10);
const TIMEOUT_MS = 15_000;

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  if (!API_KEY) {
    throw new Error(
      "BRABBLE_API_KEY is not set in backend/.env. " +
      "Get a free key at https://brabble.ai/dashboard and add it to backend/.env"
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      signal: controller.signal,
    });

    if (res.status === 401 || res.status === 403) {
      throw new Error(`Brabble API authentication failed (HTTP ${res.status}). Check BRABBLE_API_KEY.`);
    }
    if (res.status === 429) {
      throw new Error("Brabble API rate limit exceeded. Wait before retrying.");
    }
    if (!res.ok) {
      throw new Error(`Brabble API returned HTTP ${res.status}: ${res.statusText}`);
    }

    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Brabble API request timed out after ${TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── Public: fetch all pages up to MAX_PAGES ───────────────────────────────────

export async function fetchAllEvents(hub = "hackathons"): Promise<BrabbleEvent[]> {
  const all: BrabbleEvent[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;
    const url = `${BASE_URL}/listings?hub=${encodeURIComponent(hub)}&limit=${PAGE_SIZE}&offset=${offset}`;

    let result: BrabblePage;
    try {
      result = await fetchJson<BrabblePage>(url);
    } catch (err) {
      // If first page fails, re-throw; otherwise stop pagination gracefully
      if (page === 0) throw err;
      console.warn(`[eventApiClient] Page ${page + 1} fetch failed, stopping pagination:`, err);
      break;
    }

    const items = Array.isArray(result.data) ? result.data : [];
    if (items.length === 0) break;  // no more data

    all.push(...items);

    // Stop if the API says there's no more data
    if (!result.hasMore || items.length < PAGE_SIZE) break;
  }

  return all;
}

/**
 * Fetch from multiple hubs so we cover hackathons, workshops, competitions, etc.
 */
export async function fetchAllHubs(): Promise<BrabbleEvent[]> {
  const HUBS = ["hackathons", "workshops", "competitions"];
  const results = await Promise.allSettled(HUBS.map(fetchAllEvents));

  const all: BrabbleEvent[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      all.push(...r.value);
    } else {
      console.warn("[eventApiClient] Hub fetch failed:", r.reason);
    }
  }

  return all;
}
