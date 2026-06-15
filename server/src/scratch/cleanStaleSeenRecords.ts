import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find all assignments
  const assignments = await prisma.passageAssignment.findMany();
  console.log(`Found ${assignments.length} total PassageAssignment records.`);

  let deletedCount = 0;
  for (const a of assignments) {
    const seen = await prisma.userPassageSeen.findFirst({
      where: {
        user_id: a.user_id,
        passage_id: a.passage_id,
      },
    });

    if (!seen) {
      await prisma.passageAssignment.delete({
        where: {
          id: a.id,
        },
      });
      deletedCount++;
    }
  }

  console.log(`Successfully deleted ${deletedCount} orphaned PassageAssignment records.`);
  await prisma.$disconnect();
}

main().catch(console.error);
