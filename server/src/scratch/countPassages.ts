import "../lib/env.js";
import { prisma } from "../lib/prisma.js";

async function main() {
  console.log("📊 Database Diagnostic: Fetching Passage Statistics...\n");

  // 1. Total count
  const totalCount = await prisma.passage.count();
  console.log(`🔹 Total Passages in Database: ${totalCount}`);

  // 2. Ready count
  const readyCount = await prisma.passage.count({
    where: { status: "ready" },
  });
  console.log(`✅ Total 'ready' Passages: ${readyCount}`);

  // 3. Ready passages by generator
  const readyGenerators = await prisma.passage.groupBy({
    by: ["generated_by"],
    where: { status: "ready" },
    _count: {
      id: true,
    },
  });
  console.log("\n📦 'ready' Passages by Generator (generated_by):");
  for (const g of readyGenerators) {
    const generatorName = g.generated_by || "static_vault";
    console.log(`  - ${generatorName}: ${g._count.id} passages`);
  }

  // 4. All passages by generator (including retired)
  const allGenerators = await prisma.passage.groupBy({
    by: ["generated_by"],
    _count: {
      id: true,
    },
  });
  console.log("\n📚 All Passages in DB by Generator (including retired):");
  for (const g of allGenerators) {
    const generatorName = g.generated_by || "static_vault";
    console.log(`  - ${generatorName}: ${g._count.id} passages`);
  }

  // 5. Ready count by domain
  const domains = await prisma.passage.groupBy({
    by: ["domain"],
    where: { status: "ready" },
    _count: {
      id: true,
    },
  });
  console.log("\n🌐 'ready' Passages by Content Domain:");
  for (const d of domains) {
    console.log(`  - ${d.domain}: ${d._count.id} passages`);
  }
}

main()
  .catch((err) => {
    console.error("❌ Diagnostic error:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
