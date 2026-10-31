/**
 * User Embedding Service — neural profile vectors for recommendations
 *
 * Represents each student as a single 384-d vector in the SAME space as the
 * opportunity embeddings (embeddingService), so "how well does this
 * opportunity fit this student" becomes a cosine similarity.
 *
 * The vector is a weighted average of:
 *
 *   ┌──────────────────────────┬────────┬───────────────────────────────────┐
 *   │ Signal                   │ Weight │ Vector                            │
 *   ├──────────────────────────┼────────┼───────────────────────────────────┤
 *   │ Onboarding profile       │  1.0   │ embed("interested in …, looking   │
 *   │                          │        │  for …, studying …")              │
 *   │ Bookmark                 │  3.0   │ the opportunity's stored vector   │
 *   │ Register click           │  3.0   │   〃                              │
 *   │ Recommendation click     │  2.0   │   〃                              │
 *   │ View                     │  1.0   │   〃                              │
 *   │ Recent search query      │  0.5   │ embed(query)                      │
 *   └──────────────────────────┴────────┴───────────────────────────────────┘
 *
 * Activity weights decay with a 30-day half-life, so recent behaviour counts
 * more than old behaviour. Each opportunity contributes once (its strongest
 * signal), so re-opening one page repeatedly can't dominate the profile.
 *
 * Content-based by design: with only a handful of interactions per student
 * there is not enough data to train a collaborative / two-tower model yet,
 * but this works from the first onboarding answer (no cold-start problem).
 */

import { User } from "@prisma/client";
import prisma from "../lib/prisma";
import { embedTexts, EMBEDDING_DIM } from "./embeddingService";

const SIGNAL_WEIGHTS = {
  profile: 1.0,
  BOOKMARK: 3.0,
  REGISTER_CLICK: 3.0,
  RECOMMENDATION_CLICK: 2.0,
  VIEW: 1.0,
  search: 0.5,
} as const;

const HALF_LIFE_DAYS = 30;
const MAX_INTERACTIONS = 60;
const MAX_SEARCHES = 5;

export interface UserVector {
  vector: number[];
  /** True when bookmarks/views/searches contributed, not just the profile. */
  hasActivity: boolean;
}

// Profile texts and search queries repeat across requests — cache their
// embeddings so building a user vector is usually just DB reads + arithmetic.
const TEXT_CACHE_LIMIT = 500;
const textCache = new Map<string, number[]>();

async function embedCached(texts: string[]): Promise<number[][]> {
  const missing = [...new Set(texts.filter((t) => !textCache.has(t)))];
  if (missing.length > 0) {
    const vectors = await embedTexts(missing);
    missing.forEach((t, i) => {
      if (textCache.size >= TEXT_CACHE_LIMIT) {
        textCache.delete(textCache.keys().next().value as string);
      }
      textCache.set(t, vectors[i]);
    });
  }
  return texts.map((t) => textCache.get(t)!);
}

/** Natural-language rendering of the onboarding answers, or "" if none. */
export function profileText(user: User): string {
  const parts: string[] = [];
  if (user.interests.length > 0) parts.push(`Interested in ${user.interests.join(", ")}`);
  if (user.opportunityTypes.length > 0) parts.push(`Looking for ${user.opportunityTypes.join(", ").toLowerCase()}`);
  if (user.course) parts.push(`Studying ${user.course}${user.year ? `, year ${user.year}` : ""}`);
  return parts.join(". ");
}

function recencyDecay(createdAt: Date, now: number): number {
  const ageDays = Math.max(0, (now - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  return Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
}

/**
 * Builds the student's unit-length profile vector, or null when there is
 * nothing to build it from (or the embedding model is unavailable) — callers
 * then fall back to the rule-based score alone.
 */
export async function buildUserVector(user: User): Promise<UserVector | null> {
  try {
    const now = Date.now();
    const [bookmarks, interactions, searches] = await Promise.all([
      prisma.bookmark.findMany({
        where: { userId: user.id },
        select: { opportunityId: true, createdAt: true },
      }),
      prisma.opportunityInteraction.findMany({
        // Impressions are not interest — see EngagementContext in recommendationService
        where: { userId: user.id, type: { in: ["VIEW", "REGISTER_CLICK", "RECOMMENDATION_CLICK"] } },
        orderBy: { createdAt: "desc" },
        take: MAX_INTERACTIONS,
        select: { opportunityId: true, type: true, createdAt: true },
      }),
      prisma.searchInteraction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: MAX_SEARCHES,
        select: { query: true, createdAt: true },
      }),
    ]);

    // Strongest decayed signal per opportunity
    const oppWeights = new Map<string, number>();
    const consider = (oppId: string, weight: number) => {
      oppWeights.set(oppId, Math.max(oppWeights.get(oppId) ?? 0, weight));
    };
    for (const b of bookmarks) consider(b.opportunityId, SIGNAL_WEIGHTS.BOOKMARK * recencyDecay(b.createdAt, now));
    for (const i of interactions) {
      consider(i.opportunityId, SIGNAL_WEIGHTS[i.type as keyof typeof SIGNAL_WEIGHTS] * recencyDecay(i.createdAt, now));
    }

    const oppVectors = oppWeights.size > 0
      ? await prisma.opportunity.findMany({
          where: { id: { in: [...oppWeights.keys()] } },
          select: { id: true, embedding: true },
        })
      : [];

    const queries = searches.map((s) => s.query.trim()).filter(Boolean);
    const profile = profileText(user);
    const texts = profile ? [profile, ...queries] : queries;
    const textVectors = await embedCached(texts);

    const sum = new Array<number>(EMBEDDING_DIM).fill(0);
    let totalWeight = 0;
    let hasActivity = false;
    const add = (vec: number[], weight: number) => {
      if (vec.length !== EMBEDDING_DIM || weight <= 0) return;
      for (let d = 0; d < EMBEDDING_DIM; d++) sum[d] += vec[d] * weight;
      totalWeight += weight;
    };

    let t = 0;
    if (profile) add(textVectors[t++], SIGNAL_WEIGHTS.profile);
    searches.forEach((s) => {
      if (!s.query.trim()) return;
      add(textVectors[t++], SIGNAL_WEIGHTS.search * recencyDecay(s.createdAt, now));
      hasActivity = true;
    });
    for (const o of oppVectors) {
      if (o.embedding.length !== EMBEDDING_DIM) continue; // not embedded yet
      add(o.embedding, oppWeights.get(o.id)!);
      hasActivity = true;
    }

    if (totalWeight === 0) return null;
    const norm = Math.sqrt(sum.reduce((acc, x) => acc + x * x, 0));
    if (norm === 0) return null;
    return { vector: sum.map((x) => x / norm), hasActivity };
  } catch (err) {
    console.warn("[user-embedding] ⚠️  Falling back to rule-based scoring:", (err as Error).message);
    return null;
  }
}
