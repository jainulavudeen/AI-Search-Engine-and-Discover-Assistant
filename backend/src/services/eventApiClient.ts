/**
 * eventApiClient.ts
 *
 * Low-level HTTP client for the Brabble AI Listings API.
 * https://brabble.ai/api/listings — docs: https://brabble.ai/developers
 *
 * Responsibilities:
 *  - Handle authentication (Bearer token via BRABBLE_API_KEY env var)
 *  - Handle pagination (offset/limit)
 *  - Handle HTTP errors and timeouts
 *  - Return raw, typed BrabbleEvent[]
 *
 * This module NEVER runs on the frontend. All requests are server-to-server.
 * The API key lives only in backend/.env and is never sent to the client.
 *
 * NOTE ON THE REAL RESPONSE SHAPE: this was originally written against an
 * assumed API contract before the real key was available. The live API's
 * actual shape (confirmed directly against https://brabble.ai/api/listings)
 * differs from that assumption in two important ways this file now reflects:
 *   1. The results array is called `listings`, not `data`.
 *   2. Only the `hackathons` hub currently exists — `workshops` and
 *      `competitions` both 404 with "Unknown hub". Every listing in that hub
 *      is itself type "HACKATHON" / kind "competition".
 * If Brabble adds more hubs later, add them to HUBS below — everything else
 * (pagination, field mapping) already generalizes.
 */

// ── Types actually returned by the Brabble API ───────────────────────────────

export interface BrabbleEvent {
  id: string;
  title: string;
  organiser?: string;          // British spelling — that's the real field name
  type?: string;                // e.g. "HACKATHON"
  kind?: string;                // e.g. "competition"
  platform?: string;            // e.g. "Unstop" — where the listing is hosted
  url?: string;                 // the actual registration/listing page
  shareUrl?: string;            // stable brabble.ai short link, always present
  deadline?: string;            // registration deadline — the only date given
  mode?: string;                // "ONLINE" | "OFFLINE" | "HYBRID"
  city?: string;
  prize?: { label?: string; inr?: number | null };
  team?: string;                // e.g. "1 to 4"
  fee?: string;                 // "Free" or a price string
  eligibility?: string[];       // e.g. ["Undergraduate", "Engineering Students"]
  registered?: number;
}

export interface BrabblePage {
  listings: BrabbleEvent[];
  total?: number;
  count?: number;
  offset?: number;
  limit?: number;
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
      // The API returns 200 with an {"error": "..."} body for bad params
      // (e.g. an unknown hub) rather than a 4xx — surface that body's text
      // when available so a config mistake is diagnosable from the logs.
      const body = await res.json().catch(() => null);
      const detail = body && typeof body === "object" && "error" in body ? `: ${(body as { error: string }).error}` : "";
      throw new Error(`Brabble API returned HTTP ${res.status}${detail || `: ${res.statusText}`}`);
    }

    const body = (await res.json()) as T & { error?: string };
    if (body && typeof body === "object" && "error" in body && body.error) {
      throw new Error(`Brabble API error: ${body.error}`);
    }
    return body;
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

    const items = Array.isArray(result.listings) ? result.listings : [];
    if (items.length === 0) break;  // no more data

    all.push(...items);

    // The API doesn't return a "hasMore" flag — a short page means we've
    // reached the end (also stops us from looping past `total` needlessly).
    if (items.length < PAGE_SIZE) break;
  }

  return all;
}

/**
 * Fetch from every hub the API actually exposes. Currently that's just
 * "hackathons" — Promise.allSettled means adding a hub here that turns out
 * to be invalid degrades gracefully (logged, not thrown) rather than
 * failing the whole sync.
 */
export async function fetchAllHubs(): Promise<BrabbleEvent[]> {
  const HUBS = ["hackathons"];
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
