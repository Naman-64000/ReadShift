-- CreateTable
CREATE TABLE "passage_assignments" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "passage_id" TEXT NOT NULL,
  "domain_requested" "Domain",
  "level_requested" INTEGER NOT NULL,
  "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "passage_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "passage_assignments_user_id_assigned_at_idx" ON "passage_assignments"("user_id", "assigned_at");
CREATE INDEX "passage_assignments_passage_id_assigned_at_idx" ON "passage_assignments"("passage_id", "assigned_at");

-- AddForeignKey
ALTER TABLE "passage_assignments" ADD CONSTRAINT "passage_assignments_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "passage_assignments" ADD CONSTRAINT "passage_assignments_passage_id_fkey"
FOREIGN KEY ("passage_id") REFERENCES "passages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
