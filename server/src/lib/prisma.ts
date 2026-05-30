/**
 * server/src/lib/prisma.ts
 *
 * Singleton Prisma Client instance.
 *
 * What this file will do:
 *  - Export a single PrismaClient instance shared across the entire server process.
 *  - In development, attach the instance to globalThis to survive hot reloads
 *    (prevents "too many connections" warnings with tsx watch).
 *  - Configure Prisma log levels from the LOG_LEVEL env var.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
