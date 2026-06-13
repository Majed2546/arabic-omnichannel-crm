DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserType') THEN
    CREATE TYPE "UserType" AS ENUM ('COMPANY_ADMIN', 'SUPERVISOR', 'AGENT', 'CONSULTANT', 'VIEWER');
  END IF;
END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "avatar_url" TEXT,
  ADD COLUMN IF NOT EXISTS "job_title" TEXT,
  ADD COLUMN IF NOT EXISTS "user_type" "UserType" NOT NULL DEFAULT 'AGENT',
  ADD COLUMN IF NOT EXISTS "timezone" TEXT,
  ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "users_user_type_idx" ON "users"("user_type");
