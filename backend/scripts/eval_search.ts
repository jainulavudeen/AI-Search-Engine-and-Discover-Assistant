/**
 * eval_search.ts — Offline evaluation of the search pipeline stages.
 *
 * Compares three configurations on the same queries:
 *   1. Keyword          — Postgres text match only
 *   2. Hybrid           — + MiniLM bi-encoder semantic retrieval
 *   3. Hybrid + Rerank  — + ms-marco cross-encoder second stage
 *
 * All use rule-based intent (no Gemini in the pipeline) so runs are
 * deterministic and only the deep learning stages differ.
 *
 * Relevance judgments (TREC-style pooling):
 *   - The top POOL_DEPTH results of every configuration are pooled per query.
 *   - Unjudged pairs are graded by an LLM judge (Gemini, a different and larger
 *     model than any in the pipeline): 2 = relevant, 1 = partially, 0 = not.
 *   - Judgments are cached in eval/judgments.json — re-runs reuse them, so
 *     results are reproducible and grades can be reviewed/corrected by hand.
 *     The judge model is recorded per query (EVAL_JUDGE_MODEL can switch it,
 *     e.g. when one model's free-tier daily quota runs out).
 *
 * Metrics (k = 10):
 *   - NDCG@10   graded (gain = 2^grade − 1), ideal ranking from the judged pool
 *   - MRR       reciprocal rank of the first grade-2 result
 *   - P@5       fraction of the top 5 that are grade 2
 *   - Recall@10 grade-2 results in the top 10 / grade-2 results in the pool
 *
 * Run (from backend/):
 *   npm run eval:search
 *
 * Requires GEMINI_API_KEY only when there are unjudged pairs. To score just
 * the queries already fully judged (e.g. while Gemini is over quota):
 *   npm run eval:search -- --judged-only
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../src/lib/prisma";
import { aiSearch, type SearchPipelineOptions } from "../src/services/aiSearchService";

const QUERIES = [
  "coding contests for AI beginners",
  "ethical hacking events",
  "hackathons in Chennai",
  "scholarships for women in tech",
  "money to pay for my college fees",
  "learn to build mobile apps",
  "internships for computer science students",
  "cloud computing and devops competitions",
  "healthcare technology hackathon",
  "blockchain and crypto events",
  "events for first year students",
  "data science and machine learning workshops",
  "startup and entrepreneurship programs",
  "hackathons in Bangalore",
  "competitive programming and DSA contests",
  "climate change and sustainability projects",
  "jobs at big tech companies for freshers",
  "web development hackathon with react",
  "IoT and hardware events",
  "fintech challenges",
];

const SYSTEMS: Array<{ name: string; options: SearchPipelineOptions }> = [
  { name: "Keyword", options: { llmIntent: false, semantic: false, rerank: false } },
  { name: "Hybrid", options: { llmIntent: false, semantic: true, rerank: false } },
  { name: "Hybrid + Rerank", options: { llmIntent: false, semantic: true, rerank: true } },
];

const K = 10;
const POOL_DEPTH = 20;
const JUDGE_MODEL = process.env.EVAL_JUDGE_MODEL || "gemini-3.5-flash";

const EVAL_DIR = path.resolve(__dirname, "../eval");
const JUDGMENTS_PATH = path.join(EVAL_DIR, "judgments.json");
const RESULTS_PATH = path.join(EVAL_DIR, "results.md");

interface JudgmentsFile {
  /** query → judge model that graded it */
  judges: Record<string, string>;
  /** query → opportunityId → grade (0 | 1 | 2) */
  grades: Record<string, Record<string, number>>;
}

function loadJudgments(): JudgmentsFile {
  if (!fs.existsSync(JUDGMENTS_PATH)) return { judges: {}, grades: {} };
  const raw = JSON.parse(fs.readFileSync(JUDGMENTS_PATH, "utf8"));
  if (raw.grades) return raw;
  // Legacy format (grades only) — all written by the original default judge
  const judges = Object.fromEntries(Object.keys(raw).map((q) => [q, "gemini-3.5-flash"]));
  return { judges, grades: raw };
}

// ══════════════════════════════════════════════════════════════════════════════
// LLM JUDGE
// ══════════════════════════════════════════════════════════════════════════════

type Candidate = Awaited<ReturnType<typeof prisma.opportunity.findMany>>[number];

function describe(opp: Candidate, index: number): string {
  const desc = opp.description.replace(/\s+/g, " ").slice(0, 300);
  return [
    `[${index}] ${opp.title}`,
    `    ${opp.category} · ${opp.location} (${opp.mode}) · eligibility: ${opp.eligibility || "n/a"}`,
    `    skills/tags: ${[...opp.skills, ...opp.tags].join(", ") || "n/a"}`,
    `    ${desc}`,
  ].join("\n");
}

/**
 * Retries Gemini overload / rate-limit errors (503, 429) with exponential
 * backoff. A per-day quota 429 is thrown immediately — it won't clear soon.
 */
async function withRetry<T>(fn: () => Promise<T>, attempts = 6): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      const status = (err as { status?: number }).status;
      const dailyQuota = String((err as Error).message).includes("PerDay");
      if (i >= attempts || dailyQuota || (status !== 503 && status !== 429)) throw err;
      const delayMs = 5000 * 2 ** (i - 1);
      console.warn(`  judge ${status}, retrying in ${delayMs / 1000}s…`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function judge(query: string, candidates: Candidate[]): Promise<Record<string, number>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is required to judge new query/result pairs");

  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel(
    {
      model: JUDGE_MODEL,
      generationConfig: { temperature: 0, responseMimeType: "application/json", maxOutputTokens: 8192 },
    },
    { timeout: 120_000 }
  );

  const prompt = `You are grading search results for a student opportunity search engine.

A college student searched for: "${query}"

Grade EACH opportunity below for how well it satisfies that search:
  2 = relevant: clearly what the student is looking for
  1 = partially relevant: related, but misses part of the need (wrong type, wrong place, loosely related topic)
  0 = not relevant

Judge by meaning, not word overlap. Respect explicit constraints in the query
(type of opportunity, location, audience).

${candidates.map((c, i) => describe(c, i + 1)).join("\n\n")}

Return ONLY a JSON object mapping every index to its grade, e.g. {"1": 2, "2": 0, ...}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const raw = (await withRetry(() => model.generateContent(prompt))).response.text();
    const parsed = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    const grades: Record<string, number> = {};
    candidates.forEach((c, i) => {
      const g = Number(parsed[String(i + 1)]);
      if (g === 0 || g === 1 || g === 2) grades[c.id] = g;
    });
    if (Object.keys(grades).length === candidates.length) return grades;
    console.warn(`  judge returned ${Object.keys(grades).length}/${candidates.length} grades, retrying…`);
  }
  throw new Error(`Judge failed to grade all candidates for "${query}"`);
}

// ══════════════════════════════════════════════════════════════════════════════
// METRICS
// ══════════════════════════════════════════════════════════════════════════════

function dcg(grades: number[]): number {
  return grades.reduce((sum, g, i) => sum + (2 ** g - 1) / Math.log2(i + 2), 0);
}

interface QueryMetrics {
  ndcg: number;
  /** null when the pool holds no grade-2 result (excluded from averages) */
  mrr: number | null;
  p5: number | null;
  recall: number | null;
}

function evaluate(ranked: string[], judged: Record<string, number>): QueryMetrics {
  const grades = ranked.slice(0, K).map((id) => judged[id] ?? 0);
  const ideal = Object.values(judged).sort((a, b) => b - a).slice(0, K);
  const idcg = dcg(ideal);
  const totalRelevant = Object.values(judged).filter((g) => g === 2).length;

  if (totalRelevant === 0) {
    return { ndcg: idcg > 0 ? dcg(grades) / idcg : 0, mrr: null, p5: null, recall: null };
  }

  const firstRelevant = ranked.findIndex((id) => judged[id] === 2);
  return {
    ndcg: idcg > 0 ? dcg(grades) / idcg : 0,
    mrr: firstRelevant >= 0 ? 1 / (firstRelevant + 1) : 0,
    p5: ranked.slice(0, 5).filter((id) => judged[id] === 2).length / 5,
    recall: grades.filter((g) => g === 2).length / totalRelevant,
  };
}

function mean(values: Array<number | null>): number {
  const present = values.filter((v): v is number => v !== null);
  return present.length ? present.reduce((a, b) => a + b, 0) / present.length : 0;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  fs.mkdirSync(EVAL_DIR, { recursive: true });
  const file = loadJudgments();
  const judgments = file.grades;

  // 1. Run every configuration on every query
  const rankings: Record<string, Record<string, string[]>> = {}; // system → query → ids
  for (const system of SYSTEMS) {
    rankings[system.name] = {};
    for (const query of QUERIES) {
      const response = await aiSearch(query, null, undefined, system.options);
      rankings[system.name][query] = response.results.map((r) => r.id);
    }
  }

  // 2. Pool top results and judge any unjudged pairs
  const judgedOnly = process.argv.includes("--judged-only");
  const skipped = new Set<string>();
  for (const query of QUERIES) {
    const pool = new Set(SYSTEMS.flatMap((s) => rankings[s.name][query].slice(0, POOL_DEPTH)));
    const judged = (judgments[query] ??= {});
    const unjudged = [...pool].filter((id) => !(id in judged));
    if (unjudged.length === 0) continue;
    if (judgedOnly) {
      skipped.add(query);
      continue;
    }

    console.log(`Judging ${unjudged.length} results for "${query}"…`);
    const candidates = await prisma.opportunity.findMany({ where: { id: { in: unjudged } } });
    Object.assign(judged, await judge(query, candidates));
    const previous = file.judges[query];
    file.judges[query] = previous && previous !== JUDGE_MODEL ? `${previous} + ${JUDGE_MODEL}` : JUDGE_MODEL;
    fs.writeFileSync(JUDGMENTS_PATH, JSON.stringify(file, null, 2) + "\n");
  }

  // 3. Score
  const scored = QUERIES.filter((q) => !skipped.has(q));
  const perQuery: Record<string, Record<string, QueryMetrics>> = {};
  for (const system of SYSTEMS) {
    perQuery[system.name] = {};
    for (const query of scored) {
      perQuery[system.name][query] = evaluate(rankings[system.name][query], judgments[query]);
    }
  }

  const fmt = (n: number) => n.toFixed(3);
  const summaryRows = SYSTEMS.map((s) => {
    const m = Object.values(perQuery[s.name]);
    return `| ${s.name} | ${fmt(mean(m.map((x) => x.ndcg)))} | ${fmt(mean(m.map((x) => x.mrr)))} | ${fmt(
      mean(m.map((x) => x.p5))
    )} | ${fmt(mean(m.map((x) => x.recall)))} |`;
  });
  const scoredQueries = scored.filter((q) => perQuery[SYSTEMS[0].name][q].mrr !== null).length;
  const judgedPairs = scored.reduce((n, q) => n + Object.keys(judgments[q]).length, 0);
  const judgeCounts: Record<string, number> = {};
  for (const q of scored) judgeCounts[file.judges[q]] = (judgeCounts[file.judges[q]] ?? 0) + 1;
  const judgeSummary = Object.entries(judgeCounts)
    .map(([model, n]) => `\`${model}\` (${n} quer${n === 1 ? "y" : "ies"})`)
    .join(", ");

  const report = `# Search Evaluation

${scored.length} queries${
    skipped.size ? ` (partial — ${skipped.size} of ${QUERIES.length} not yet judged; run without --judged-only to finish)` : ""
  } · ${judgedPairs} judged query–result pairs · judges: ${judgeSummary} · generated ${new Date().toISOString().slice(0, 10)}

| System | NDCG@10 | MRR | P@5 | Recall@10 |
|--------|---------|-----|-----|-----------|
${summaryRows.join("\n")}

MRR, P@5 and Recall@10 count grade-2 ("relevant") results and average over the ${scoredQueries} queries whose pool contains at least one; NDCG@10 is graded and averages over all ${scored.length}.

## NDCG@10 per query

| Query | ${SYSTEMS.map((s) => s.name).join(" | ")} |
|-------|${SYSTEMS.map(() => "------").join("|")}|
${scored.map((q) => `| ${q} | ${SYSTEMS.map((s) => fmt(perQuery[s.name][q].ndcg)).join(" | ")} |`).join("\n")}
`;

  fs.writeFileSync(RESULTS_PATH, report);
  console.log("\n" + report);
  console.log(`Saved ${path.relative(process.cwd(), RESULTS_PATH)} and ${path.relative(process.cwd(), JUDGMENTS_PATH)}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
