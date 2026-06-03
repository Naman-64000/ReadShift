import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.passage.deleteMany({
    where: {
      source: "static_vault",
    },
  });
  console.log(`Successfully deleted ${result.count} static_vault passages from the database.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
