import "../lib/env.js";
import { prisma } from "../lib/prisma.js";

async function main() {
  console.log("🔍 Dumping Session/Assignment history for the two seen passages...\n");

  const targetPassageIds = [
    "e6d2841e-9a50-4769-96dd-9172605aa2d8",
    "521b3f78-27e5-42c4-9a37-3bd5e079bcd1"
  ];

  for (const pid of targetPassageIds) {
    console.log(`=========================================`);
    console.log(`Passage ID: ${pid}`);

    // 1. Passage Assignments
    const assignments = await prisma.passageAssignment.findMany({
      where: { passage_id: pid }
    });
    console.log(`Assignments (${assignments.length}):`);
    console.log(JSON.stringify(assignments, null, 2));

    // 2. Active Sessions
    const sessions = await prisma.session.findMany({
      where: { passage_id: pid }
    });
    console.log(`Sessions (${sessions.length}):`);
    console.log(JSON.stringify(sessions, null, 2));
  }
}

main()
  .catch((err) => {
    console.error("❌ Diagnostic error:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
