/**
 * Reranker Service — local cross-encoder for second-stage relevance scoring
 *
 * Model: ms-marco-MiniLM-L-6-v2 (6-layer transformer cross-encoder, trained
 * on the MS MARCO passage-ranking dataset).
 *
 * Bi-encoder vs cross-encoder:
 *   - embeddingService (bi-encoder) encodes query and opportunity SEPARATELY,
 *     so vectors can be precomputed and compared cheaply → used for retrieval.
 *   - This cross-encoder reads "[CLS] query [SEP] opportunity [SEP]" TOGETHER,
 *     so every query token attends to every opportunity token. Far more
 *     accurate, but must run once per (query, opportunity) pair at search
 *     time → only applied to the ≤50 retrieved candidates.
 *
 * Output: one relevance logit per pair (higher = more relevant). Logits are
 * only comparable within a single query, so callers should normalise them
 * across the candidate set rather than treat them as absolute scores.
 */

import path from "path";

export const RERANKER_MODEL = "Xenova/ms-marco-MiniLM-L-6-v2";

/** Shared with embeddingService — weights are cached here after first download. */
const MODEL_CACHE_DIR = path.resolve(__dirname, "../../.model-cache");

/** Description chars kept per passage — keeps title/skills inside the 512-token window. */
const MAX_DESCRIPTION_CHARS = 600;

// ══════════════════════════════════════════════════════════════════════════════
// MODEL LOADING (lazy singleton)
// ══════════════════════════════════════════════════════════════════════════════

type Tokenizer = (
  text: string[],
  options: { text_pair: string[]; padding: boolean; truncation: boolean }
) => Record<string, unknown>;

type Model = (inputs: Record<string, unknown>) => Promise<{ logits: { tolist(): number[][] } }>;

let rerankerPromise: Promise<{ tokenizer: Tokenizer; model: Model }> | null = null;

function getReranker() {
  if (!rerankerPromise) {
    rerankerPromise = (async () => {
      const { AutoTokenizer, AutoModelForSequenceClassification, env } = await import(
        "@huggingface/transformers"
      );
      env.cacheDir = MODEL_CACHE_DIR;
      const started = Date.now();
      const [tokenizer, model] = await Promise.all([
        AutoTokenizer.from_pretrained(RERANKER_MODEL),
        AutoModelForSequenceClassification.from_pretrained(RERANKER_MODEL, { dtype: "q8" }),
      ]);
      console.log(`[reranker] ✅ Loaded ${RERANKER_MODEL} in ${Date.now() - started}ms`);
      return {
        tokenizer: tokenizer as unknown as Tokenizer,
        model: model as unknown as Model,
      };
    })().catch((err) => {
      // Allow a later call to retry (e.g. first download failed while offline)
      rerankerPromise = null;
      throw err;
    });
  }
  return rerankerPromise;
}

/** Loads the model in the background so the first search doesn't pay for it. */
export function warmUpReranker(): void {
  getReranker().catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[reranker] ⚠️ Warm-up failed (search will skip reranking): ${msg}`);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// OPPORTUNITY → PASSAGE
// ══════════════════════════════════════════════════════════════════════════════

type RerankableOpportunity = {
  title: string;
  description: string;
  category: string;
  location: string;
  mode: string;
  skills: string[];
  tags: string[];
  eligibility: string;
};

/**
 * The passage the cross-encoder reads for an opportunity. Unlike the
 * embedding text, it includes location and mode so queries like
 * "hackathons in Chennai" can be judged on where the event actually is.
 */
export function rerankPassage(opp: RerankableOpportunity): string {
  const description =
    opp.description.length > MAX_DESCRIPTION_CHARS
      ? `${opp.description.slice(0, MAX_DESCRIPTION_CHARS)}…`
      : opp.description;

  return [
    opp.title,
    `${opp.category.toLowerCase()} in ${opp.location} (${opp.mode.toLowerCase()})`,
    [...opp.skills, ...opp.tags].join(", "),
    opp.eligibility,
    description,
  ]
    .filter(Boolean)
    .join(". ");
}

// ══════════════════════════════════════════════════════════════════════════════
// SCORING
// ══════════════════════════════════════════════════════════════════════════════

/** Returns one relevance logit per passage for the given query, in input order. */
export async function rerankScores(query: string, passages: string[]): Promise<number[]> {
  if (passages.length === 0) return [];
  const { tokenizer, model } = await getReranker();
  const inputs = tokenizer(
    passages.map(() => query),
    { text_pair: passages, padding: true, truncation: true }
  );
  const { logits } = await model(inputs);
  return logits.tolist().map((row) => row[0]);
}
