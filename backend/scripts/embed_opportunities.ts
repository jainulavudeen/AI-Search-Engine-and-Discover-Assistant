/**
 * embed_opportunities.ts — Backfill semantic-search embeddings.
 *
 * Embeds every opportunity whose text changed since its vector was built
 * (all of them on first run). The server also does this automatically on
 * startup and after writes; this script is for doing it explicitly.
 *
 * Run (from backend/):
 *   npm run db:embed
 */
import { syncEmbeddings } from "../src/services/embeddingService";
import prisma from "../src/lib/prisma";

async function main() {
  const started = Date.now();
  const count = await syncEmbeddings();
  console.log(`Embedded ${count} opportunities in ${Date.now() - started}ms`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
