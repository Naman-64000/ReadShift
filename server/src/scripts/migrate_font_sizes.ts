import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Migrating users with old font sizes (18px or 21px) to 14px...");

  const result = await prisma.userPreferences.updateMany({
    where: {
      font_size_px: {
        in: [18, 21],
      },
    },
    data: {
      font_size_px: 14,
    },
  });

  console.log(`Successfully migrated ${result.count} user preferences records.`);
}

main()
  .catch((err) => {
    console.error("Migration script failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
