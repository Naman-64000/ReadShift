import "../lib/env.js";
import { prisma } from "../lib/prisma.js";

async function main() {
  const count = await prisma.passage.count({
    where: {
      quality_score: null,
    },
  });
  console.log(`Count of passages with NULL quality score: ${count}`);

  const sample = await prisma.passage.findMany({
    where: {
      quality_score: null,
    },
    take: 5,
    select: {
      id: true,
      title: true,
      source: true,
    },
  });
  console.log("Sample null quality passages:", sample);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
