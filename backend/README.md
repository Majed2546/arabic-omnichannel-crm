# Arabic Omnichannel CRM Backend

NestJS backend foundation for a multi-tenant Arabic omnichannel CRM.

## Stack

- NestJS + TypeScript
- Prisma ORM + PostgreSQL
- Redis
- Socket.io gateway foundation
- BullMQ queues for messages, notifications, and automation

## Local Setup

```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
npm run prisma:generate
npm run prisma:validate
npm run build
npm run start:dev
```

Health endpoint:

```bash
GET /health
```

## Architecture

`src/modules` contains product domains: auth, tenants, users, inbox, conversations, messages, channels, whatsapp, notifications, automation, and realtime.

Shared layers:

- `common`: health and cross-cutting app module pieces
- `config`: environment configuration
- `database`: Prisma and Redis providers
- `events`: BullMQ queues and event bus placeholder
- `guards`: authentication/tenant guard placeholders
- `decorators`: request helper decorators

## Realtime Readiness

The realtime module exposes a Socket.io gateway shell. It is prepared for a future NestJS gateway backed by Redis adapter fanout and BullMQ event jobs.

Realtime backend endpoints and namespaces:

- Socket.io namespaces: `/inbox`, `/notifications`, `/presence`
- REST health: `GET /realtime/health`
- Event log: `GET /realtime/events`
- Presence view: `GET /realtime/presence?tenantId=...`
- Mock simulator: `POST /realtime/simulate`

Realtime architecture decisions:

- Socket authentication is currently a placeholder that requires `tenantId` in handshake auth/query and stores socket context on `socket.data`.
- Tenant isolation uses tenant rooms: `tenant:{tenantId}`.
- Conversation rooms use `tenant:{tenantId}:conversation:{conversationId}`.
- Agent rooms use `tenant:{tenantId}:agent:{agentId}`.
- Presence states are tracked in memory as `online`, `away`, and `offline`; this is ready to move to Redis when multi-instance presence durability is required.
- The Redis adapter enables Socket.io fanout across instances. A lightweight Redis Pub/Sub event channel is also present for backend services that publish events without holding a gateway reference.
- Published events include an `instanceId` so Redis Pub/Sub self-echoes are ignored.
- The module is prepared for WhatsApp webhook ingestion, queue events, automation workflow events, notification events, and future BullMQ processors.

## WhatsApp Readiness

The WhatsApp module is intentionally placeholder-only. It is ready for Meta Cloud API, Embedded Signup, webhooks, template sync, and message delivery callbacks.

The webhook engine is available under `src/modules/whatsapp` with verification, ingestion, BullMQ queue handoff, message mapping, realtime publishing, diagnostics, and sample fixtures.

Message persistence is available under `src/modules/messages` with Prisma transactions, conversation summary updates, unread counts, BullMQ processing hooks, and realtime publication after durable writes.

## Database Architecture Decisions

The Prisma schema is designed as a tenant-first PostgreSQL foundation. Every business table that stores operational CRM data carries `tenant_id`, including users, roles, channels, customers, queues, conversations, messages, notifications, and workflows. Permissions are global catalog entries, while `role_permissions` maps tenant roles to those permission keys.

Core design choices:

- Tenant isolation is enforced structurally with `tenant_id` on business entities and tenant-prefixed unique constraints such as user email, role name, and queue name.
- Realtime inbox reads are optimized by indexes on conversation status, priority, queue, assigned user, SLA deadline, and created timestamps.
- Message history is optimized by `conversation_id` and compound `[tenant_id, conversation_id, created_at]` indexes for fast threaded chat loading.
- WhatsApp and future channel providers use `Channel.config`, `Message.external_message_id`, and JSON metadata fields to store provider-specific state without schema churn.
- Queue operations and SLA tracking are modeled with `Queue.sla_policy`, `Conversation.queue_id`, and `Conversation.sla_deadline`.
- RBAC uses `Role`, global `Permission`, and explicit `RolePermission` for auditability and simple future migration to a policy service.
- Soft delete is available on mutable business records via `deleted_at`, while audit fields use `created_by`, `updated_by`, and `updated_at`.
- JSON fields are reserved for provider payloads, workflow rule expressions, and operational metadata; hot query paths remain normalized and indexed.

The schema is PostgreSQL-compatible and intentionally modular so future services can split around inbox, realtime, automation, WhatsApp, and analytics boundaries without rewriting core identifiers.
