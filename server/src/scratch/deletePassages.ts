import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Delete static_vault passages (and their related data)
  const staticResult = await prisma.passage.deleteMany({
    where: {
      source: "static_vault",
    },
  });
  console.log(`Deleted ${staticResult.count} static_vault passages.`);

  // Delete gemini (NOT gemini2, NOT gemini3) passages
  // source = 'gemini' exactly, NOT 'gemini2' or 'gemini-2' etc
  const geminiResult = await prisma.passage.deleteMany({
    where: {
      source: "gemini",
    },
  });
  console.log(`Deleted ${geminiResult.count} gemini passages.`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
