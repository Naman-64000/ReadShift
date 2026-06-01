import "../lib/env.js";
import { prisma } from "../lib/prisma.js";

async function main() {
  console.log("🚀 Retiring all non-gemini and non-gemini 2 passages...");

  const result = await prisma.passage.updateMany({
    where: {
      NOT: {
        source: {
          in: ["gemini", "gemini 2"],
        },
      },
    },
    data: {
      status: "retired",
    },
  });

  console.log(`✅ Successfully retired ${result.count} static/other passages.`);
}

main()
  .catch((err) => {
    console.error("❌ Error retiring passages:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
