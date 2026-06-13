-- SaaS multi-tenant subscription foundation.
-- Existing ACTIVE tenants remain valid; new lifecycle states are additive.

ALTER TYPE "TenantStatus" ADD VALUE IF NOT EXISTS 'TRIAL';
ALTER TYPE "TenantStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

DO $$
BEGIN
  CREATE TYPE "TenantPlan" AS ENUM ('STARTER', 'PROFESSIONAL', 'ENTERPRISE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "logo_url" TEXT,
  ADD COLUMN IF NOT EXISTS "subscription_start" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "subscription_end" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "max_users" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "max_channels" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS "monthly_conversation_limit" INTEGER NOT NULL DEFAULT 1000;

ALTER TABLE "tenants"
  ALTER COLUMN "plan" TYPE "TenantPlan"
  USING (
    CASE lower(coalesce("plan", 'starter'))
      WHEN 'professional' THEN 'PROFESSIONAL'::"TenantPlan"
      WHEN 'enterprise' THEN 'ENTERPRISE'::"TenantPlan"
      ELSE 'STARTER'::"TenantPlan"
    END
  ),
  ALTER COLUMN "plan" SET DEFAULT 'STARTER',
  ALTER COLUMN "plan" SET NOT NULL;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "platform_role" "PlatformRole" NOT NULL DEFAULT 'COMPANY_USER';

CREATE INDEX IF NOT EXISTS "tenants_plan_idx" ON "tenants"("plan");
CREATE INDEX IF NOT EXISTS "tenants_subscription_end_idx" ON "tenants"("subscription_end");
CREATE INDEX IF NOT EXISTS "users_platform_role_idx" ON "users"("platform_role");
