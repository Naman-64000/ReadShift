-- AlterTable
ALTER TABLE "users" ADD COLUMN     "last_session_at" TIMESTAMP(3),
ADD COLUMN     "streak_days" INTEGER NOT NULL DEFAULT 0;
