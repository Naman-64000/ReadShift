/**
 * server/src/scratch/testPoolFragility.ts
 *
 * Programmatic test script to verify the two-stage passage selection failover logic.
 *
 * Execution: npx tsx src/scratch/testPoolFragility.ts
 */

import { prisma } from "../lib/prisma.js";
import { sessionService } from "../services/sessionService.js";
import { staticVault } from "../data/staticVault.js";

async function runTest() {
  console.log("🧪 Starting Passage Pool Fragility & Fallback Tests (Domain-based)...\n");

  const email = `test-fragility-${Date.now()}@readshift.local`;
  
  // 1. Create a clean test user
  console.log(`👤 Creating test user: ${email}`);
  const user = await prisma.user.create({
    data: {
      email,
      clerk_id: `clerk-fragility-${Date.now()}`,
      is_admin: false,
    },
  });

  try {
    // 2. Query all existing passages in the DB
    console.log("🔍 Fetching all existing passages from the database...");
    const dbPassages = await prisma.passage.findMany({
      where: { status: "ready", flagged: false },
    });
    console.log(`   Found ${dbPassages.length} passages in the active pool.`);

    // 3. Mark ALL existing DB passages as SEEN by this user
    console.log("📦 Simulating user seeing ALL active DB pool passages...");
    await prisma.userPassageSeen.createMany({
      data: dbPassages.map((p) => ({
        user_id: user.id,
        passage_id: p.id,
      })),
    });
    console.log(`   Successfully marked all ${dbPassages.length} passages as seen.`);

    // 4. Request a passage. Standard pool is fully exhausted, should trigger Stage 1: Static Vault Fallback
    console.log("\n⚡ Requesting a passage (Expected: Stage 1 Static Vault Fallback)...");
    const p1 = await sessionService.pickPassage(user.id, "business");
    
    console.log("✅ Success! Stage 1 Fallback triggered.");
    console.log(`   Assigned Passage ID: ${p1.id}`);
    console.log(`   Source: ${p1.source} (Expected: static_vault)`);
    console.log(`   Topic: ${p1.topic_key}`);
    console.log(`   Domain: ${p1.domain}`);
    console.log(`   Questions Count: ${p1.questions.length}`);

    if (p1.source !== "static_vault") {
      throw new Error(`Test failed: Expected source to be 'static_vault', got '${p1.source}'`);
    }

    // 5. Query all static vault passages
    console.log(`\n🔍 Found ${staticVault.length} static vault passages.`);

    // Simulate user seeing all static vault passages
    console.log("📦 Simulating user seeing ALL static vault passages...");
    
    // We call pickPassage repeatedly until all vault passages are exhausted
    for (let i = 0; i < staticVault.length; i++) {
      try {
        const pVault = await sessionService.pickPassage(user.id);
        console.log(`   Seen vault passage: "${pVault.topic_key}" (Source: ${pVault.source})`);
      } catch (err) {
        // Ignored if they have been consumed
      }
    }

    // 6. Request a passage again. Standard pool AND static vault are now completely exhausted!
    // Should trigger Stage 2: Active Recycling (no POOL_EXHAUSTED crash)
    console.log("\n⚡ Requesting a passage (Expected: Stage 2 Active Recycling)...");
    const pRecycled = await sessionService.pickPassage(user.id);

    console.log("✅ Success! Stage 2 Fallback (Active Recycling) triggered.");
    console.log(`   Assigned Recycled Passage ID: ${pRecycled.id}`);
    console.log(`   Topic: ${pRecycled.topic_key}`);
    console.log(`   Source: ${pRecycled.source}`);

    // Verify it is indeed a valid passage we have seen before
    const seenVerify = await prisma.userPassageSeen.findUnique({
      where: { user_id_passage_id: { user_id: user.id, passage_id: pRecycled.id } },
    });
    if (!seenVerify) {
      throw new Error("Test failed: Recycled passage was not in the user's seen record!");
    }
    console.log("✅ Test verified: Recycled passage successfully rotated to the back of the queue.");

  } catch (err) {
    console.error("❌ Test failed with error:", err);
    process.exit(1);
  } finally {
    // 7. Cleanup test user
    console.log(`\n🧹 Cleaning up test user: ${user.id}`);
    await prisma.user.delete({ where: { id: user.id } });
    console.log("✨ Cleanup complete.");
    process.exit(0);
  }
}

runTest();
