CREATE TYPE "MeetingProvider" AS ENUM ('ZOOM', 'WEBEX', 'TEAMS', 'GOOGLE_MEET', 'CUSTOM');
CREATE TYPE "MeetingStatus" AS ENUM ('NOT_CREATED', 'LINK_ADDED', 'SENT', 'COMPLETED', 'CANCELLED');

CREATE TABLE "meetings" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "appointment_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "conversation_id" TEXT,
  "provider" "MeetingProvider" NOT NULL,
  "meeting_link" TEXT NOT NULL,
  "meeting_id" TEXT,
  "status" "MeetingStatus" NOT NULL DEFAULT 'LINK_ADDED',
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "meetings_appointment_id_key" ON "meetings"("appointment_id");
CREATE INDEX "meetings_tenant_id_idx" ON "meetings"("tenant_id");
CREATE INDEX "meetings_tenant_id_provider_idx" ON "meetings"("tenant_id", "provider");
CREATE INDEX "meetings_tenant_id_status_idx" ON "meetings"("tenant_id", "status");
CREATE INDEX "meetings_tenant_id_customer_id_idx" ON "meetings"("tenant_id", "customer_id");
CREATE INDEX "meetings_deleted_at_idx" ON "meetings"("deleted_at");

ALTER TABLE "meetings" ADD CONSTRAINT "meetings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
