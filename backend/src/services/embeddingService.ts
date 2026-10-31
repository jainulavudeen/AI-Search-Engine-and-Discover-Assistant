/**
 * Embedding Service — local transformer sentence embeddings for semantic search
 *
 * Model: all-MiniLM-L6-v2 (Sentence-BERT family, 6-layer transformer, 384-d)
 *   - Trained with a contrastive objective so texts with similar MEANING land
 *     close together in vector space, even with zero keyword overlap
 *     ("coding contest for AI beginners" ≈ "Intro to ML Hackathon").
 *   - Runs fully in-process via ONNX Runtime (transformers.js) — no API key,
 *     no network calls after the one-time weight download (~23 MB, int8).
 *
 * Pipeline per text: tokenize → transformer → mean pooling → L2 normalise.
 * Because vectors are unit length, cosine similarity == dot product.
 *
 * Storage: Opportunity.embedding (Float[]). Similarity is computed in Node —
 * at hundreds-to-low-thousands of rows a brute-force scan is sub-millisecond.
 * Switch to a pgvector column + HNSW index if the catalogue grows past ~50k.
 */

import { createHash } from "crypto";
import path from "path";
import type { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";

export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
export const EMBEDDING_DIM = 384;

/** Weights are cached here after the first download (gitignored). */
const MODEL_CACHE_DIR = path.resolve(__dirname, "../../.model-cache");

const SYNC_BATCH_SIZE = 32;

// ══════════════════════════════════════════════════════════════════════════════
// MODEL LOADING (lazy singleton)
// ══════════════════════════════════════════════════════════════════════════════

type Extractor = (
  texts: string[],
  options: { pooling: "mean"; normalize: boolean }
) => Promise<{ tolist(): number[][] }>;

let extractorPromise: Promise<Extractor> | null = null;

function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.cacheDir = MODEL_CACHE_DIR;
      const started = Date.now();
      const extractor = await pipeline("feature-extraction", EMBEDDING_MODEL, { dtype: "q8" });
      console.log(`[embeddings] ✅ Loaded ${EMBEDDING_MODEL} in ${Date.now() - started}ms`);
      return extractor as unknown as Extractor;
    })().catch((err) => {
      // Allow a later call to retry (e.g. first download failed while offline)
      extractorPromise = null;
      throw err;
    });
  }
  return extractorPromise;
}

/** Embeds a batch of texts into L2-normalised 384-d vectors. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const extractor = await getExtractor();
  const output = await extractor(texts, { pooling: "mean", normalize: true });
  return output.tolist();
}

export async function embedText(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  return vector;
}

/** Dot product — equals cosine similarity for unit-length vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

// ══════════════════════════════════════════════════════════════════════════════
// OPPORTUNITY → TEXT
// ══════════════════════════════════════════════════════════════════════════════

type EmbeddableOpportunity = {
  title: string;
  description: string;
  category: string;
  skills: string[];
  tags: string[];
  eligibility: string;
};

/**
 * The text an opportunity is embedded from. Short, high-signal fields go
 * first: MiniLM truncates long inputs, so a long description must not push
 * the title and skills out of the window.
 */
export function opportunityEmbeddingText(opp: EmbeddableOpportunity): string {
  return [
    opp.title,
    opp.category.toLowerCase(),
    [...opp.skills, ...opp.tags].join(", "),
    opp.eligibility,
    opp.description,
  ]
    .filter(Boolean)
    .join(". ");
}

function embeddingHash(text: string): string {
  return createHash("sha1").update(`${EMBEDDING_MODEL}\n${text}`).digest("hex");
}

// ══════════════════════════════════════════════════════════════════════════════
// BACKFILL / SYNC
// ══════════════════════════════════════════════════════════════════════════════

let syncInFlight: Promise<number> | null = null;
let syncRequestedAgain = false;

/**
 * Embeds every opportunity whose text (or the model) changed since its vector
 * was built. Idempotent and cheap when nothing changed — safe to call after
 * every write. Concurrent calls coalesce into one follow-up run.
 *
 * @returns number of opportunities (re-)embedded
 */
export function syncEmbeddings(): Promise<number> {
  if (syncInFlight) {
    syncRequestedAgain = true;
    return syncInFlight;
  }
  syncInFlight = runSync().finally(() => {
    syncInFlight = null;
    if (syncRequestedAgain) {
      syncRequestedAgain = false;
      void scheduleEmbeddingSync();
    }
  });
  return syncInFlight;
}

async function runSync(): Promise<number> {
  const rows = await prisma.opportunity.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      skills: true,
      tags: true,
      eligibility: true,
      embeddingHash: true,
    },
  });

  const stale = rows
    .map((row) => {
      const text = opportunityEmbeddingText(row);
      return { id: row.id, text, hash: embeddingHash(text), current: row.embeddingHash };
    })
    .filter((r) => r.hash !== r.current);

  if (stale.length === 0) return 0;

  console.log(`[embeddings] Embedding ${stale.length} opportunit${stale.length === 1 ? "y" : "ies"}…`);

  for (let i = 0; i < stale.length; i += SYNC_BATCH_SIZE) {
    const batch = stale.slice(i, i + SYNC_BATCH_SIZE);
    const vectors = await embedTexts(batch.map((b) => b.text));
    await prisma.$transaction(
      batch.map((b, j) =>
        prisma.opportunity.update({
          where: { id: b.id },
          data: { embedding: vectors[j], embeddingHash: b.hash },
        })
      )
    );
  }

  console.log(`[embeddings] ✅ Embedded ${stale.length} opportunities`);
  return stale.length;
}

/** Fire-and-forget sync for write paths — never throws, never blocks a response. */
export function scheduleEmbeddingSync(): void {
  syncEmbeddings().catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[embeddings] ⚠️ Sync failed (semantic search will use stale/missing vectors): ${msg}`);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SEMANTIC RETRIEVAL
// ══════════════════════════════════════════════════════════════════════════════

export interface SemanticHit {
  id: string;
  similarity: number;
}

/**
 * Scores every opportunity matching `where` by cosine similarity to the query,
 * highest first. Rows not yet embedded are skipped.
 */
export async function semanticSearch(
  query: string,
  where: Prisma.OpportunityWhereInput
): Promise<SemanticHit[]> {
  const [queryVector, candidates] = await Promise.all([
    embedText(query),
    prisma.opportunity.findMany({ where, select: { id: true, embedding: true } }),
  ]);

  return candidates
    .filter((c) => c.embedding.length === EMBEDDING_DIM)
    .map((c) => ({ id: c.id, similarity: cosineSimilarity(queryVector, c.embedding) }))
    .sort((a, b) => b.similarity - a.similarity);
}
