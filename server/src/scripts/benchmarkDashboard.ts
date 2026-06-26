/**
 * server/src/scripts/benchmarkDashboard.ts
 * Run with: npm run benchmark:perf [-- --simulate-production]
 */
import "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { redis, verifyRedisConnection } from "../lib/redis.js";
import { dashboardService } from "../services/dashboardService.js";
import { performance } from "perf_hooks";

async function runBenchmark() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const simulateProduction = args.includes("--simulate-production");

  console.log(`⚡ Starting ReadShift Dashboard Benchmark...`);
  console.log(`🔧 Mode: ${simulateProduction ? "Simulated Production (Cloud RTT + 1000+ rows)" : "Local Docker (Low latency + 50 rows)"}\n`);

  // --- PHASE 1: Latency Injection & Setup ---
  if (simulateProduction) {
    console.log("⏳ Injecting simulated production latencies:");
    console.log("   - Database Query RTT Delay: 120ms per execution");
    console.log("   - Redis Cache Get/Set RTT Delay: 4ms per execution");

    // Use Prisma middleware to inject query latency
    prisma.$use(async (params, next) => {
      console.log(`🔍 [Prisma Middleware] Intercepted: ${params.model}.${params.action}`);
      await new Promise((resolve) => setTimeout(resolve, 120));
      return next(params);
    });

    // Patch Redis get/setex to inject cache RTT latency
    const originalGet = redis.get.bind(redis);
    redis.get = async (key: string) => {
      await new Promise((resolve) => setTimeout(resolve, 4));
      return originalGet(key);
    };

    const originalSetex = redis.setex.bind(redis);
    redis.setex = async (key: string, seconds: number, value: string) => {
      await new Promise((resolve) => setTimeout(resolve, 4));
      return originalSetex(key, seconds, value);
    };
  }

  // --- PHASE 2: Connection Verification ---
  const startDbConn = performance.now();
  try {
    await prisma.$connect();
  } catch (error) {
    console.error("🔴 Failed to connect to PostgreSQL:", error);
    process.exit(1);
  }
  const dbConnDuration = performance.now() - startDbConn;
  console.log(`🟢 PostgreSQL connection verified in ${dbConnDuration.toFixed(2)} ms`);

  const startRedisConn = performance.now();
  const redisConnected = await verifyRedisConnection();
  if (!redisConnected) {
    console.error("🔴 Redis is not available. Please start Redis to run this benchmark.");
    process.exit(1);
  }
  const redisConnDuration = performance.now() - startRedisConn;
  console.log(`🟢 Redis connection verified in ${redisConnDuration.toFixed(2)} ms`);

  // --- PHASE 3: Seed Management ---
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "perf-test@readshift.com",
        username: "perftest",
        streak_days: 5,
      },
    });
  }
  const userId = user.id;

  let passage = await prisma.passage.findFirst();
  if (!passage) {
    passage = await prisma.passage.create({
      data: {
        id: "perf-test-passage",
        title: "Performance Test Passage",
        text: "This is a simple text used for performance testing the dashboard queries.",
        word_count: 12,
        domain: "philosophy",
        difficulty: "medium",
      },
    });
  }
  const passageId = passage.id;

  // Clear existing sessions to make sure we seed exactly the targeted amount
  await prisma.session.deleteMany({ where: { user_id: userId } });

  const targetCount = simulateProduction ? 1000 : 50;
  console.log(`📝 Seeding exactly ${targetCount} mock sessions for user ${userId}...`);

  const domains = ["philosophy", "psychology", "history", "society", "biology"];
  const mockSessions = Array.from({ length: targetCount }).map((_, i) => ({
    user_id: userId,
    passage_id: passageId,
    target_wpm: 250 + (i % 5) * 20,
    actual_wpm: 240 + (i % 5) * 20,
    comprehension: i % 2 === 0 ? 3 : 2,
    domain: domains[i % domains.length],
    elapsed_ms: 60000,
    chunk_size: 3,
    fading_used: false,
    guide_used: false,
    started_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000 - 3600000),
    completed_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
  }));
  await prisma.session.createMany({ data: mockSessions });

  console.log(`📊 Benchmark dataset initialized: ${targetCount} user sessions & 1 calibration record.`);

  // --- PHASE 4: Latency Measurement ---
  console.log("\n📊 Running latency measurements (10 iterations per test)...");

  const cacheKey = "dashboard:summary:\${userId}";

  // 1. Cold DB Run (First run - fresh query execution)
  await redis.del(cacheKey);
  const startColdDb = performance.now();
  await dashboardService.buildSummary(userId);
  const coldDbDuration = performance.now() - startColdDb;

  // 2. Warm DB Runs (Looping 10 times, clearing cache beforehand to force DB hit)
  const dbRuns: number[] = [];
  for (let i = 0; i < 10; i++) {
    await redis.del(cacheKey);
    const start = performance.now();
    await dashboardService.buildSummary(userId);
    dbRuns.push(performance.now() - start);
  }

  // 3. Populate Redis Cache
  const startCacheWrite = performance.now();
  await dashboardService.buildSummary(userId); // This populates the cache
  const cacheWriteDuration = performance.now() - startCacheWrite;

  // 4. Redis Cache Hit Runs (Looping 10 times, reading from cache)
  const redisRuns: number[] = [];
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    await dashboardService.buildSummary(userId);
    redisRuns.push(performance.now() - start);
  }

  // --- PHASE 5: Statistics & Compilation ---
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const avg = (arr: number[]) => sum(arr) / arr.length;
  const min = (arr: number[]) => Math.min(...arr);
  const max = (arr: number[]) => Math.max(...arr);
  const stdDev = (arr: number[], meanVal: number) => {
    const variance = sum(arr.map(x => Math.pow(x - meanVal, 2))) / arr.length;
    return Math.sqrt(variance);
  };

  const avgDb = avg(dbRuns);
  const avgRedis = avg(redisRuns);

  const reductionCold = (((coldDbDuration - avgRedis) / coldDbDuration) * 100).toFixed(1);
  const speedupCold = (coldDbDuration / avgRedis).toFixed(1);

  const reductionWarm = (((avgDb - avgRedis) / avgDb) * 100).toFixed(1);
  const speedupWarm = (avgDb / avgRedis).toFixed(1);

  console.log("\n==========================================================================");
  console.log("📈 PERFORMANCE COMPARISON RESULTS");
  console.log("==========================================================================");
  console.log(`Cold Start PostgreSQL (Fresh execution plan) : ${coldDbDuration.toFixed(2)} ms`);
  console.log(`Warm PostgreSQL Direct Query (Average of 10)  : ${avgDb.toFixed(2)} ms (Min: ${min(dbRuns).toFixed(2)}ms, Max: ${max(dbRuns).toFixed(2)}ms, SD: ${stdDev(dbRuns, avgDb).toFixed(2)}ms)`);
  console.log(`Redis Cache Hit (Average of 10)               : ${avgRedis.toFixed(2)} ms (Min: ${min(redisRuns).toFixed(2)}ms, Max: ${max(redisRuns).toFixed(2)}ms, SD: ${stdDev(redisRuns, avgRedis).toFixed(2)}ms)`);
  console.log(`Redis Cache Write Latency                     : ${cacheWriteDuration.toFixed(2)} ms`);
  console.log("--------------------------------------------------------------------------\n");

  console.log("📋 Latency Breakdown Table:\n");
  console.log("Metric\t\t\tDirect PostgreSQL Query (Cache Miss)\tRedis Caching (Cache Hit)\tLatency Reduction\tSpeed Factor");
  console.log(`Cold Start Time\t\t${coldDbDuration.toFixed(2)} ms\t\t\t\t${avgRedis.toFixed(2)} ms\t\t\t\t${reductionCold}%\t\t\t${speedupCold}x faster`);
  console.log(`Warm Query Time\t\t${avgDb.toFixed(2)} ms\t\t\t\t${avgRedis.toFixed(2)} ms\t\t\t\t${reductionWarm}%\t\t\t${speedupWarm}x faster`);
  console.log("\n==========================================================================\n");

  // Cleanup connections
  await prisma.$disconnect();
  await redis.quit();
}

runBenchmark().catch(console.error);
