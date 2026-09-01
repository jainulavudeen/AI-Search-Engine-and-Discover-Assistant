/**
 * promote_admin.ts — Promote an existing registered user to ADMIN.
 *
 * There is no signup flow for admins by design (this is a student-facing
 * app) — an operator runs this once against a real registered account.
 *
 * Run (from backend/):
 *   npx ts-node-dev --transpile-only --exit-child scripts/promote_admin.ts you@example.com
 */
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx ts-node-dev --transpile-only --exit-child scripts/promote_admin.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user registered with email "${email}". Register the account first, then run this script.`);
    process.exit(1);
  }

  if (user.role === Role.ADMIN) {
    console.log(`"${email}" is already an admin.`);
    return;
  }

  await prisma.user.update({
    where: { email },
    data: { role: Role.ADMIN },
  });

  console.log(`✅ "${email}" is now an admin. They must log in again for the new role to take effect (existing tokens don't carry it).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
