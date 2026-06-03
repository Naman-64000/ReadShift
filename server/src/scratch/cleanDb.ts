import "../lib/env.js";
import { prisma } from "../lib/prisma.js";

async function clean() {
  console.log("🚀 Starting database cleanup...");

  // Find all passages that are retired, static_vault, or seed
  const passagesToDelete = await prisma.passage.findMany({
    where: {
      OR: [
        { status: "retired" },
        { source: "static_vault" },
        { generated_by: "static_vault" },
        { source: "seed" },
        { generated_by: "seed" },
      ],
    },
    select: {
      id: true,
      title: true,
      source: true,
      status: true,
    },
  });

  console.log(`Found ${passagesToDelete.length} passages to remove.`);
  if (passagesToDelete.length === 0) {
    console.log("No passages found to remove. Database is already clean!");
    return;
  }

  const passageIds = passagesToDelete.map((p) => p.id);

  // 1. Delete associated Response records (dependent on Session)
  console.log("Deleting dependent Response records...");
  const responseDeleteResult = await prisma.response.deleteMany({
    where: {
      session: {
        passage_id: { in: passageIds },
      },
    },
  });
  console.log(`✅ Deleted ${responseDeleteResult.count} Response records.`);

  // 2. Delete associated Session records (dependent on Passage)
  console.log("Deleting dependent Session records...");
  const sessionDeleteResult = await prisma.session.deleteMany({
    where: {
      passage_id: { in: passageIds },
    },
  });
  console.log(`✅ Deleted ${sessionDeleteResult.count} Session records.`);

  // 3. Delete the Passages (this will cascade delete Questions, UserPassageSeen, and PassageAssignments due to onDelete: Cascade)
  console.log("Deleting Passage records...");
  const passageDeleteResult = await prisma.passage.deleteMany({
    where: {
      id: { in: passageIds },
    },
  });
  console.log(`✅ Deleted ${passageDeleteResult.count} Passage records (and cascaded Questions/Assignments).`);

  console.log("\n🎉 Database cleanup successfully completed!");
}

clean().catch(console.error);
