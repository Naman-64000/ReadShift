import "../lib/env.js";
import { prisma } from "../lib/prisma.js";

async function main() {
  console.log("📊 DATABASE DIAGNOSTIC: Total Passage Distribution Breakdown (320 Passages)\n");

  // 1. Group by status
  const statusGroup = await prisma.passage.groupBy({
    by: ["status"],
    _count: { id: true }
  });
  console.log("🟢 1. DISTRIBUTION BY STATUS:");
  for (const s of statusGroup) {
    console.log(`  - ${s.status}: ${s._count.id} passages`);
  }

  // 2. Group by domain (all passages in database)
  const domainGroupAll = await prisma.passage.groupBy({
    by: ["domain"],
    _count: { id: true }
  });
  console.log("\n🌐 2. TOTAL DISTRIBUTION BY DOMAIN (including retired/drafts):");
  for (const d of domainGroupAll) {
    console.log(`  - ${d.domain}: ${d._count.id} passages`);
  }

  // 3. Group by domain for 'ready' passages
  const domainGroupReady = await prisma.passage.groupBy({
    by: ["domain"],
    where: { status: "ready" },
    _count: { id: true }
  });
  console.log("\n✅ 3. ACTIVE 'READY' PASSAGES BY DOMAIN:");
  for (const d of domainGroupReady) {
    console.log(`  - ${d.domain}: ${d._count.id} passages`);
  }

  // 4. Group by source (all passages)
  const sourceGroupAll = await prisma.passage.groupBy({
    by: ["source"],
    _count: { id: true }
  });
  console.log("\n📦 4. TOTAL PASSAGES BY BATCH SOURCE (including retired):");
  for (const s of sourceGroupAll) {
    const name = s.source || "static_vault";
    console.log(`  - ${name}: ${s._count.id} passages`);
  }

  // 5. Group by generator (all passages)
  const generatorGroupAll = await prisma.passage.groupBy({
    by: ["generated_by"],
    _count: { id: true }
  });
  console.log("\n🤖 5. TOTAL PASSAGES BY GENERATOR (including retired):");
  for (const g of generatorGroupAll) {
    const name = g.generated_by || "static_vault";
    console.log(`  - ${name}: ${g._count.id} passages`);
  }
}

main()
  .catch((err) => {
    console.error("❌ Diagnostic error:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
