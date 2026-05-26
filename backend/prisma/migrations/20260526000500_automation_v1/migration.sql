CREATE TYPE "AutomationTriggerType" AS ENUM (
  'NEW_MESSAGE',
  'CONVERSATION_UNASSIGNED',
  'SLA_BREACHED',
  'APPOINTMENT_CREATED',
  'APPOINTMENT_DUE_SOON',
  'TICKET_CREATED',
  'TICKET_STATUS_CHANGED'
);

CREATE TYPE "AutomationLogStatus" AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED');

CREATE TABLE "automation_rules" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "trigger_type" "AutomationTriggerType" NOT NULL,
  "conditions" JSONB,
  "actions" JSONB NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),

  CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "automation_logs" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "rule_id" TEXT,
  "trigger_type" "AutomationTriggerType" NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "status" "AutomationLogStatus" NOT NULL,
  "message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "automation_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "automation_rules_tenant_id_idx" ON "automation_rules"("tenant_id");
CREATE INDEX "automation_rules_tenant_id_trigger_type_idx" ON "automation_rules"("tenant_id", "trigger_type");
CREATE INDEX "automation_rules_tenant_id_is_active_idx" ON "automation_rules"("tenant_id", "is_active");
CREATE INDEX "automation_rules_deleted_at_idx" ON "automation_rules"("deleted_at");

CREATE INDEX "automation_logs_tenant_id_idx" ON "automation_logs"("tenant_id");
CREATE INDEX "automation_logs_tenant_id_rule_id_idx" ON "automation_logs"("tenant_id", "rule_id");
CREATE INDEX "automation_logs_tenant_id_status_idx" ON "automation_logs"("tenant_id", "status");
CREATE INDEX "automation_logs_tenant_id_trigger_type_idx" ON "automation_logs"("tenant_id", "trigger_type");
CREATE INDEX "automation_logs_created_at_idx" ON "automation_logs"("created_at");

ALTER TABLE "automation_rules"
  ADD CONSTRAINT "automation_rules_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "automation_logs"
  ADD CONSTRAINT "automation_logs_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "automation_logs"
  ADD CONSTRAINT "automation_logs_rule_id_fkey"
  FOREIGN KEY ("rule_id") REFERENCES "automation_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
