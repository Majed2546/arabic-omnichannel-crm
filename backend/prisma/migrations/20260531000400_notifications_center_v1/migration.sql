DO $$ BEGIN
  CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TICKET_CREATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TICKET_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'APPOINTMENT_UPCOMING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MESSAGE_SEND_FAILED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_WARNING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AUTOMATION_EXECUTED';

ALTER TYPE "NotificationPriority" ADD VALUE IF NOT EXISTS 'LOW';
ALTER TYPE "NotificationPriority" ADD VALUE IF NOT EXISTS 'MEDIUM';
ALTER TYPE "NotificationPriority" ADD VALUE IF NOT EXISTS 'HIGH';
ALTER TYPE "NotificationPriority" ADD VALUE IF NOT EXISTS 'URGENT';

ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "team_id" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "message" TEXT NOT NULL DEFAULT '';
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "target_type" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "target_id" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD';

UPDATE "notifications"
SET "message" = "body"
WHERE "message" = '';

UPDATE "notifications"
SET "status" = CASE
  WHEN "deleted_at" IS NOT NULL THEN 'ARCHIVED'::"NotificationStatus"
  WHEN "read_at" IS NOT NULL THEN 'READ'::"NotificationStatus"
  ELSE 'UNREAD'::"NotificationStatus"
END;

DO $$ BEGIN
  ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_team_id_fkey"
    FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "notifications_tenant_id_team_id_idx" ON "notifications"("tenant_id", "team_id");
CREATE INDEX IF NOT EXISTS "notifications_tenant_id_status_idx" ON "notifications"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "notifications_tenant_id_target_type_target_id_idx" ON "notifications"("tenant_id", "target_type", "target_id");
