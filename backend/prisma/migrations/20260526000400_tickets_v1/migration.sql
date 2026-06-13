CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED');
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TABLE "tickets" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "customer_id" TEXT,
  "conversation_id" TEXT,
  "assigned_user_id" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
  "category" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "due_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tickets_tenant_id_idx" ON "tickets"("tenant_id");
CREATE INDEX "tickets_tenant_id_status_idx" ON "tickets"("tenant_id", "status");
CREATE INDEX "tickets_tenant_id_priority_idx" ON "tickets"("tenant_id", "priority");
CREATE INDEX "tickets_tenant_id_customer_id_idx" ON "tickets"("tenant_id", "customer_id");
CREATE INDEX "tickets_tenant_id_assigned_user_id_idx" ON "tickets"("tenant_id", "assigned_user_id");
CREATE INDEX "tickets_tenant_id_due_at_idx" ON "tickets"("tenant_id", "due_at");
CREATE INDEX "tickets_deleted_at_idx" ON "tickets"("deleted_at");

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
