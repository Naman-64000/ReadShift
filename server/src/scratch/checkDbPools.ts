import "../lib/env.js";
import { prisma } from "../lib/prisma.js";

async function main() {
  console.log("🚀 Diagnostic: Checking User and Passage levels in database...");

  // 1. Get all users
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          passageViews: true,
          sessions: true,
        },
      },
    },
  });

  console.log("\n--- Users ---");
  for (const u of users) {
    console.log(`User ID: ${u.id}`);
    console.log(`  - Email: ${u.email}`);

    console.log(`  - Streak: ${u.streak_days}`);
    console.log(`  - Seen count: ${u._count.passageViews}`);
    console.log(`  - Sessions count: ${u._count.sessions}`);
  }

  // 2. Count ready passages per level and domain
  console.log("\n--- Active Ready Passages (not retired, not flagged) ---");
  const passages = await prisma.passage.findMany({
    where: {
      status: "ready",
      flagged: false,
    },
    select: {
      id: true,
      domain: true,

      source: true,
    },
  });

  console.log(`Total active ready passages in DB: ${passages.length}`);

  const counts: Record<string, number> = {};
  for (const p of passages) {
    const key = p.domain;
    counts[key] = (counts[key] || 0) + 1;
  }

  console.log("\nCounts by Domain:");
  console.log(counts);

  // 3. Count retired passages
  const retiredCount = await prisma.passage.count({
    where: { status: "retired" },
  });
  console.log(`\nRetired passages in DB: ${retiredCount}`);
}

main()
  .catch((err) => {
    console.error("❌ Diagnostic error:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
