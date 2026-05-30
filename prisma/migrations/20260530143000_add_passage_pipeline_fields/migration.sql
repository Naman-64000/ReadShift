-- CreateEnum
CREATE TYPE "PassageStatus" AS ENUM ('draft', 'ready', 'flagged', 'retired');

-- AlterTable
ALTER TABLE "passages"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'seed',
  ADD COLUMN "status" "PassageStatus" NOT NULL DEFAULT 'ready',
  ADD COLUMN "quality_score" INTEGER,
  ADD COLUMN "topic_key" TEXT,
  ADD COLUMN "hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "passages_hash_key" ON "passages"("hash");
