import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.passage.groupBy({
    by: ["source", "generated_by", "status"],
    _count: {
      id: true,
    },
  });
  console.log("Passage distribution:");
  console.log(JSON.stringify(counts, null, 2));

  // Let's also print titles of passages that might be static vault
  const staticPassages = await prisma.passage.findMany({
    where: {
      OR: [
        { source: { contains: "static" } },
        { generated_by: { contains: "static" } },
        { source: "static_vault" }
      ]
    },
    select: {
      id: true,
      title: true,
      source: true,
      generated_by: true
    }
  });
  console.log(`Found ${staticPassages.length} possible static passages:`);
  console.log(JSON.stringify(staticPassages, null, 2));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
