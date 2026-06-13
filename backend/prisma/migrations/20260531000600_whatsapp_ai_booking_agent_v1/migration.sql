DO $$ BEGIN
  CREATE TYPE "BotFlowType" AS ENUM ('MAIN_MENU', 'BOOK_APPOINTMENT', 'CREATE_TICKET', 'HANDOFF');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "BotStateStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'HANDED_OFF');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "whatsapp_bot_settings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenant_id" TEXT NOT NULL UNIQUE,
  "is_enabled" BOOLEAN NOT NULL DEFAULT false,
  "welcome_message" TEXT NOT NULL DEFAULT 'أهلًا بك 👋
كيف نقدر نخدمك؟
1. حجز موعد
2. الدعم الفني
3. متابعة طلب
4. التحدث مع موظف',
  "handoff_message" TEXT NOT NULL DEFAULT 'تم تحويلك لأحد موظفينا، سيتم الرد عليك قريبًا.',
  "appointment_enabled" BOOLEAN NOT NULL DEFAULT true,
  "ticket_enabled" BOOLEAN NOT NULL DEFAULT true,
  "working_hours_only" BOOLEAN NOT NULL DEFAULT false,
  "default_appointment_duration_minutes" INTEGER NOT NULL DEFAULT 30,
  "default_assigned_team_id" TEXT,
  "default_assigned_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_bot_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "whatsapp_bot_settings_default_assigned_team_id_fkey" FOREIGN KEY ("default_assigned_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "whatsapp_bot_settings_default_assigned_user_id_fkey" FOREIGN KEY ("default_assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "conversation_bot_states" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "customer_id" TEXT,
  "flow_type" "BotFlowType" NOT NULL DEFAULT 'MAIN_MENU',
  "step" TEXT NOT NULL,
  "collected_data" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "status" "BotStateStatus" NOT NULL DEFAULT 'ACTIVE',
  "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversation_bot_states_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "conversation_bot_states_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "conversation_bot_states_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "whatsapp_bot_settings_tenant_id_idx" ON "whatsapp_bot_settings"("tenant_id");
CREATE INDEX IF NOT EXISTS "whatsapp_bot_settings_default_assigned_team_id_idx" ON "whatsapp_bot_settings"("default_assigned_team_id");
CREATE INDEX IF NOT EXISTS "whatsapp_bot_settings_default_assigned_user_id_idx" ON "whatsapp_bot_settings"("default_assigned_user_id");
CREATE INDEX IF NOT EXISTS "conversation_bot_states_tenant_id_idx" ON "conversation_bot_states"("tenant_id");
CREATE INDEX IF NOT EXISTS "conversation_bot_states_tenant_id_conversation_id_status_idx" ON "conversation_bot_states"("tenant_id", "conversation_id", "status");
CREATE INDEX IF NOT EXISTS "conversation_bot_states_tenant_id_customer_id_idx" ON "conversation_bot_states"("tenant_id", "customer_id");
