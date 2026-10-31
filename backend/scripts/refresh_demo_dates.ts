/**
 * refresh_demo_dates.ts — Move expired hand-curated opportunities back into
 * the future so demo data stays searchable.
 *
 * Only touches manual rows (source = null) whose registration deadline has
 * passed. Each row's start/end/deadline shift by the same whole number of
 * weeks, so weekdays and the gap between deadline and event are preserved,
 * landing the deadline at least MIN_DAYS_AHEAD days from today.
 * External (Brabble) rows are never modified — re-sync those instead.
 *
 * Unlike `npm run db:seed`, this does NOT delete anything.
 *
 * Run (from backend/):
 *   npm run db:refresh-dates
 */
import prisma from "../src/lib/prisma";

const MIN_DAYS_AHEAD = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function shift(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms);
}

async function main() {
  const now = new Date();
  const target = now.getTime() + MIN_DAYS_AHEAD * DAY_MS;

  const expired = await prisma.opportunity.findMany({
    where: { source: null, registrationDeadline: { lt: now } },
    select: { id: true, title: true, startDate: true, endDate: true, registrationDeadline: true },
  });

  for (const opp of expired) {
    const weeks = Math.ceil((target - opp.registrationDeadline.getTime()) / WEEK_MS);
    const ms = weeks * WEEK_MS;
    const registrationDeadline = shift(opp.registrationDeadline, ms);

    await prisma.opportunity.update({
      where: { id: opp.id },
      data: {
        startDate: shift(opp.startDate, ms),
        endDate: opp.endDate ? shift(opp.endDate, ms) : null,
        registrationDeadline,
      },
    });

    console.log(
      `+${weeks}w  ${registrationDeadline.toISOString().slice(0, 10)}  ${opp.title}`
    );
  }

  console.log(`\nRefreshed ${expired.length} expired manual opportunities`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
