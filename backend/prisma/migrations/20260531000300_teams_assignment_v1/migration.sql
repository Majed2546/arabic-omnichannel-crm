DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TeamType') THEN
    CREATE TYPE "TeamType" AS ENUM ('SUPPORT', 'SALES', 'TECHNICAL', 'OPERATIONS', 'CUSTOM');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TeamMemberRole') THEN
    CREATE TYPE "TeamMemberRole" AS ENUM ('LEAD', 'MEMBER');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "teams" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" "TeamType" NOT NULL DEFAULT 'SUPPORT',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "team_members" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "team_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" "TeamMemberRole" NOT NULL DEFAULT 'MEMBER',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "teams_tenant_id_name_key" ON "teams"("tenant_id", "name");
CREATE INDEX IF NOT EXISTS "teams_tenant_id_idx" ON "teams"("tenant_id");
CREATE INDEX IF NOT EXISTS "teams_tenant_id_is_active_idx" ON "teams"("tenant_id", "is_active");
CREATE INDEX IF NOT EXISTS "teams_tenant_id_type_idx" ON "teams"("tenant_id", "type");
CREATE INDEX IF NOT EXISTS "teams_deleted_at_idx" ON "teams"("deleted_at");
CREATE UNIQUE INDEX IF NOT EXISTS "team_members_tenant_id_team_id_user_id_key" ON "team_members"("tenant_id", "team_id", "user_id");
CREATE INDEX IF NOT EXISTS "team_members_tenant_id_idx" ON "team_members"("tenant_id");
CREATE INDEX IF NOT EXISTS "team_members_tenant_id_team_id_idx" ON "team_members"("tenant_id", "team_id");
CREATE INDEX IF NOT EXISTS "team_members_tenant_id_user_id_idx" ON "team_members"("tenant_id", "user_id");

ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "assigned_team_id" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "assigned_team_id" TEXT;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "assigned_team_id" TEXT;

CREATE INDEX IF NOT EXISTS "conversations_tenant_id_assigned_team_id_status_idx" ON "conversations"("tenant_id", "assigned_team_id", "status");
CREATE INDEX IF NOT EXISTS "tickets_tenant_id_assigned_team_id_idx" ON "tickets"("tenant_id", "assigned_team_id");
CREATE INDEX IF NOT EXISTS "appointments_tenant_id_assigned_team_id_idx" ON "appointments"("tenant_id", "assigned_team_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_tenant_id_fkey') THEN
    ALTER TABLE "teams" ADD CONSTRAINT "teams_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_members_tenant_id_fkey') THEN
    ALTER TABLE "team_members" ADD CONSTRAINT "team_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_members_team_id_fkey') THEN
    ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_members_user_id_fkey') THEN
    ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_assigned_team_id_fkey') THEN
    ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assigned_team_id_fkey" FOREIGN KEY ("assigned_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_assigned_team_id_fkey') THEN
    ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_team_id_fkey" FOREIGN KEY ("assigned_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_assigned_team_id_fkey') THEN
    ALTER TABLE "appointments" ADD CONSTRAINT "appointments_assigned_team_id_fkey" FOREIGN KEY ("assigned_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
