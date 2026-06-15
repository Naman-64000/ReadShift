import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const assignments = await prisma.passageAssignment.findMany({
    orderBy: { assigned_at: "desc" },
    include: {
      passage: {
        select: {
          title: true,
        }
      }
    }
  });

  console.log("Found PassageAssignment records:");
  for (const a of assignments) {
    console.log(`User: ${a.user_id}, Passage: ${a.passage.title} (${a.passage_id}), Left At: ${a.left_at_ms} ms, Assigned At: ${a.assigned_at}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
