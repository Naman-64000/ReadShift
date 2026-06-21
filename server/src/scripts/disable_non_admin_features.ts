import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting DB update to disable roadmaps for non-admins...");

  const result = await prisma.userPreferences.updateMany({
    where: {
      user: {
        is_admin: false,
      },
    },
    data: {
      roadmaps_enabled: false,
    },
  });

  console.log(`Successfully updated ${result.count} user preference records.`);
}

main()
  .catch((err) => {
    console.error("Error executing script:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
