DO $$ BEGIN
  CREATE TYPE "SlaStatus" AS ENUM ('ON_TRACK', 'WARNING', 'BREACHED', 'PAUSED', 'MET');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "first_response_due_at" TIMESTAMP(3);
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "resolution_due_at" TIMESTAMP(3);
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "first_responded_at" TIMESTAMP(3);
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "resolved_at" TIMESTAMP(3);
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "sla_status" "SlaStatus" NOT NULL DEFAULT 'ON_TRACK';
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "escalated_at" TIMESTAMP(3);
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "escalation_level" INTEGER;

ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "first_response_due_at" TIMESTAMP(3);
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "resolution_due_at" TIMESTAMP(3);
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "first_responded_at" TIMESTAMP(3);
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "resolved_at" TIMESTAMP(3);
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "sla_status" "SlaStatus" NOT NULL DEFAULT 'ON_TRACK';
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "escalated_at" TIMESTAMP(3);
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "escalation_level" INTEGER;

UPDATE "conversations"
SET
  "first_response_due_at" = COALESCE("first_response_due_at", "sla_deadline"),
  "resolution_due_at" = COALESCE("resolution_due_at", "sla_deadline"),
  "sla_status" = CASE
    WHEN "status" IN ('RESOLVED', 'CLOSED') THEN 'MET'::"SlaStatus"
    WHEN "sla_breached_at" IS NOT NULL THEN 'BREACHED'::"SlaStatus"
    WHEN "sla_warned_at" IS NOT NULL THEN 'WARNING'::"SlaStatus"
    ELSE "sla_status"
  END
WHERE "deleted_at" IS NULL;

UPDATE "tickets"
SET "resolution_due_at" = COALESCE("resolution_due_at", "due_at")
WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "conversations_tenant_id_sla_status_idx" ON "conversations"("tenant_id", "sla_status");
CREATE INDEX IF NOT EXISTS "conversations_tenant_id_first_response_due_at_idx" ON "conversations"("tenant_id", "first_response_due_at");
CREATE INDEX IF NOT EXISTS "conversations_tenant_id_resolution_due_at_idx" ON "conversations"("tenant_id", "resolution_due_at");
CREATE INDEX IF NOT EXISTS "tickets_tenant_id_sla_status_idx" ON "tickets"("tenant_id", "sla_status");
CREATE INDEX IF NOT EXISTS "tickets_tenant_id_resolution_due_at_idx" ON "tickets"("tenant_id", "resolution_due_at");
