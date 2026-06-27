-- AlterTable
ALTER TABLE "calibrations" ALTER COLUMN "recorded_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "passage_assignments" ADD COLUMN     "left_at_ms" INTEGER,
ALTER COLUMN "assigned_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "passages" ADD COLUMN     "flag_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paragraph_roadmaps" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "explanations" TEXT[];

-- AlterTable
ALTER TABLE "sessions" ALTER COLUMN "started_at" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "completed_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "user_passage_seen" ADD COLUMN     "reallowed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "time_spent_ms" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "seen_at" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "user_prefs" ADD COLUMN     "gemini_api_key" TEXT,
ADD COLUMN     "laap_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mcqs_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "progress_bar_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "roadmaps_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "timed_passages_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "timer_enabled" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "chunk_size" SET DEFAULT 2,
ALTER COLUMN "fading_enabled" SET DEFAULT true,
ALTER COLUMN "font_size_px" SET DEFAULT 14,
ALTER COLUMN "highlight_intensity" SET DEFAULT 'intense';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "last_session_at" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "is_admin" SET DEFAULT false;

-- CreateTable
CREATE TABLE "drill_passages" (
    "id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "word_count" INTEGER NOT NULL,
    "question_stem" TEXT NOT NULL,
    "options" TEXT[],
    "correct_index" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drill_passages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_drill_seen" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "drill_passage_id" TEXT NOT NULL,
    "seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_drill_seen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_drill_seen_user_id_drill_passage_id_key" ON "user_drill_seen"("user_id", "drill_passage_id");

-- AddForeignKey
ALTER TABLE "user_drill_seen" ADD CONSTRAINT "user_drill_seen_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_drill_seen" ADD CONSTRAINT "user_drill_seen_drill_passage_id_fkey" FOREIGN KEY ("drill_passage_id") REFERENCES "drill_passages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
