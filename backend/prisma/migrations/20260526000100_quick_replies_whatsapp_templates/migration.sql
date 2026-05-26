CREATE TYPE "WhatsAppTemplateStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');

CREATE TABLE "quick_replies" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "category" TEXT,
  "channel_type" "ChannelType",
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quick_replies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_templates" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'ar',
  "category" TEXT NOT NULL,
  "status" "WhatsAppTemplateStatus" NOT NULL DEFAULT 'DRAFT',
  "body" TEXT NOT NULL,
  "variables" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "channel_type" "ChannelType" NOT NULL DEFAULT 'WHATSAPP',
  "meta_template_id" TEXT,
  "rejection_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "quick_replies_tenant_id_idx" ON "quick_replies"("tenant_id");
CREATE INDEX "quick_replies_tenant_id_is_active_idx" ON "quick_replies"("tenant_id", "is_active");
CREATE INDEX "quick_replies_tenant_id_channel_type_idx" ON "quick_replies"("tenant_id", "channel_type");
CREATE INDEX "whatsapp_templates_tenant_id_idx" ON "whatsapp_templates"("tenant_id");
CREATE INDEX "whatsapp_templates_tenant_id_status_idx" ON "whatsapp_templates"("tenant_id", "status");
CREATE INDEX "whatsapp_templates_tenant_id_name_idx" ON "whatsapp_templates"("tenant_id", "name");

ALTER TABLE "quick_replies" ADD CONSTRAINT "quick_replies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "whatsapp_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
