import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database domain migration...");

  // 1. Add new enum values to Postgres "Domain" type
  const newValues = [
    "philosophy",
    "psychology",
    "arts_and_museum",
    "society",
    "culture",
    "biology",
    "science_and_technology"
  ];

  for (const val of newValues) {
    try {
      console.log(`Adding enum value '${val}' to 'Domain'...`);
      await prisma.$executeRawUnsafe(`ALTER TYPE "Domain" ADD VALUE '${val}';`);
    } catch (e: any) {
      // Postgres throws an error if enum value already exists, which we can safely ignore
      if (e.message?.includes("already exists")) {
        console.log(`Enum value '${val}' already exists.`);
      } else {
        console.error(`Failed to add enum value '${val}':`, e);
      }
    }
  }

  // 2. Migrate existing data in passages table
  console.log("Migrating passages table...");
  await prisma.$executeRawUnsafe(`UPDATE passages SET domain = 'philosophy' WHERE domain::text = 'abstract';`);
  await prisma.$executeRawUnsafe(`UPDATE passages SET domain = 'psychology' WHERE domain::text = 'social';`);
  await prisma.$executeRawUnsafe(`UPDATE passages SET domain = 'science_and_technology' WHERE domain::text = 'science';`);
  await prisma.$executeRawUnsafe(`UPDATE passages SET domain = 'society' WHERE domain::text = 'business';`);

  // 3. Migrate existing data in passage_assignments table
  console.log("Migrating passage_assignments table...");
  await prisma.$executeRawUnsafe(`UPDATE passage_assignments SET domain_requested = 'philosophy' WHERE domain_requested::text = 'abstract';`);
  await prisma.$executeRawUnsafe(`UPDATE passage_assignments SET domain_requested = 'psychology' WHERE domain_requested::text = 'social';`);
  await prisma.$executeRawUnsafe(`UPDATE passage_assignments SET domain_requested = 'science_and_technology' WHERE domain_requested::text = 'science';`);
  await prisma.$executeRawUnsafe(`UPDATE passage_assignments SET domain_requested = 'society' WHERE domain_requested::text = 'business';`);

  // 4. Migrate sessions table (where domain is text/varchar)
  console.log("Migrating sessions table...");
  await prisma.$executeRawUnsafe(`UPDATE sessions SET domain = 'philosophy' WHERE domain = 'abstract';`);
  await prisma.$executeRawUnsafe(`UPDATE sessions SET domain = 'psychology' WHERE domain = 'social';`);
  await prisma.$executeRawUnsafe(`UPDATE sessions SET domain = 'science_and_technology' WHERE domain = 'science';`);
  await prisma.$executeRawUnsafe(`UPDATE sessions SET domain = 'society' WHERE domain = 'business';`);

  // 5. Reset user preferences to new default domains
  console.log("Resetting user preferences domains...");
  await prisma.$executeRawUnsafe(`
    UPDATE user_prefs
    SET domains = ARRAY[
      'philosophy',
      'psychology',
      'history',
      'arts_and_museum',
      'society',
      'culture',
      'biology',
      'science_and_technology'
    ]::"Domain"[];
  `);

  console.log("Data migration successfully completed!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
