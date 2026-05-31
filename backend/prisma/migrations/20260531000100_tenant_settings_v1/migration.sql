CREATE TABLE IF NOT EXISTS "tenant_settings" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "company_display_name" TEXT,
  "logo_url" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Riyadh',
  "language" TEXT NOT NULL DEFAULT 'ar',
  "working_days" JSONB NOT NULL DEFAULT '["SUN","MON","TUE","WED","THU"]',
  "working_hours" JSONB NOT NULL DEFAULT '{"start":"09:00","end":"17:00","slaWarningBeforeMinutes":10}',
  "sla_first_response_minutes" INTEGER NOT NULL DEFAULT 15,
  "sla_resolution_minutes" INTEGER NOT NULL DEFAULT 240,
  "notification_settings" JSONB NOT NULL DEFAULT '{"newMessage":true,"newTicket":true,"upcomingAppointment":true,"slaBreached":true,"messageSendFailed":true}',
  "default_conversation_priority" "ConversationPriority" NOT NULL DEFAULT 'NORMAL',
  "default_ticket_priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
  "default_appointment_duration_minutes" INTEGER NOT NULL DEFAULT 30,
  "message_signature" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_settings_tenant_id_key" ON "tenant_settings"("tenant_id");
CREATE INDEX IF NOT EXISTS "tenant_settings_tenant_id_idx" ON "tenant_settings"("tenant_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenant_settings_tenant_id_fkey'
  ) THEN
    ALTER TABLE "tenant_settings"
      ADD CONSTRAINT "tenant_settings_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
