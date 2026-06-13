CREATE TYPE "OnboardingRequestStatus" AS ENUM ('NEW', 'WAITING_FOR_INFO', 'UNDER_REVIEW', 'READY_TO_CREATE', 'ACTIVATED', 'REJECTED');

CREATE TYPE "OnboardingOperationMode" AS ENUM ('PLATFORM_ONLY', 'APP_AND_PLATFORM');

CREATE TABLE "onboarding_requests" (
    "id" TEXT NOT NULL,
    "organization_name" TEXT NOT NULL,
    "website" TEXT,
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "requested_plan" "TenantPlan" NOT NULL,
    "requested_users" INTEGER NOT NULL DEFAULT 5,
    "requested_channels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "whatsapp_number" TEXT,
    "has_meta_business" BOOLEAN NOT NULL DEFAULT false,
    "has_whatsapp_business_app" BOOLEAN NOT NULL DEFAULT false,
    "operation_mode" "OnboardingOperationMode" NOT NULL DEFAULT 'PLATFORM_ONLY',
    "status" "OnboardingRequestStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "activated_tenant_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "onboarding_requests_activated_tenant_id_key" ON "onboarding_requests"("activated_tenant_id");
CREATE INDEX "onboarding_requests_status_idx" ON "onboarding_requests"("status");
CREATE INDEX "onboarding_requests_requested_plan_idx" ON "onboarding_requests"("requested_plan");
CREATE INDEX "onboarding_requests_created_at_idx" ON "onboarding_requests"("created_at");

ALTER TABLE "onboarding_requests" ADD CONSTRAINT "onboarding_requests_activated_tenant_id_fkey" FOREIGN KEY ("activated_tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
