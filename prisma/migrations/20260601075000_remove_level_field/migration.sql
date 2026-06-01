-- Remove level field from users table
ALTER TABLE "users" DROP COLUMN IF EXISTS "level";

-- Remove level field from passages table
ALTER TABLE "passages" DROP COLUMN IF EXISTS "level";

-- Remove level field from sessions table
ALTER TABLE "sessions" DROP COLUMN IF EXISTS "level";

-- Remove level_requested field from passage_assignments table
ALTER TABLE "passage_assignments" DROP COLUMN IF EXISTS "level_requested";
