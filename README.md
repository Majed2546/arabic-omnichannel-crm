# Arabic Omnichannel CRM

Modern Arabic RTL SaaS frontend for an omnichannel CRM platform.

## Stack

- React + TypeScript
- Vite
- Zustand UI store
- Feature-based folder structure
- NestJS REST API integration
- Socket.IO-ready realtime architecture

## Experience

- Arabic RTL layout by default
- Dark navy enterprise SaaS interface
- Right-side navigation shell
- Topbar with current tenant and user profile
- Dashboard, tenants, users, roles, channels, unified inbox, and WhatsApp onboarding pages
- Responsive layout with loading and empty states

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

## API Configuration

The frontend talks to the NestJS backend through REST routes and defaults to the Docker nginx proxy path:

```bash
VITE_API_BASE_URL=/api
```

GraphQL is not required or exposed by the backend. Realtime transport is kept on the existing Socket.IO route at `/socket.io`.

## Authentication and RBAC

The CRM supports a phased auth model:

- `AUTH_MODE=local` keeps the current development login active and does not require Keycloak.
- `AUTH_MODE=keycloak` validates API bearer tokens with Keycloak JWKS and maps Keycloak roles/groups to CRM roles.

Backend environment variables:

```bash
AUTH_MODE=local
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=arabic-crm
KEYCLOAK_CLIENT_ID=crm-api
KEYCLOAK_CLIENT_SECRET=
KEYCLOAK_ISSUER=http://localhost:8080/realms/arabic-crm
```

Frontend environment variables:

```bash
VITE_AUTH_MODE=local
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=arabic-crm
VITE_KEYCLOAK_CLIENT_ID=crm-web
VITE_KEYCLOAK_ISSUER=http://localhost:8080/realms/arabic-crm
```

Local mode:

```bash
AUTH_MODE=local
VITE_AUTH_MODE=local
npm run dev
cd backend && npm run start:dev
```

Keycloak mode:

```bash
docker compose --profile keycloak up keycloak keycloak-db
```

Create a realm named `arabic-crm`, a public frontend client such as `crm-web`, and an API client/audience such as `crm-api`. Add one or more roles or groups that map to CRM roles:

- `admin`, `crm-admin`, or `crm_admin` -> CRM admin
- `support`, `crm-support`, `crm_support`, or `agent` -> CRM support
- `analyst`, `crm-analyst`, `crm_analyst`, or `reports` -> CRM analyst

Then run the frontend/backend with:

```bash
AUTH_MODE=keycloak
VITE_AUTH_MODE=keycloak
```

CRM permissions are defined consistently in the backend and frontend, including `dashboard.view`, `inbox.view`, `inbox.reply`, `inbox.assign`, `roles.manage`, and `settings.manage`. In local mode, backend guards allow the existing development flow; in Keycloak mode, API routes require a valid bearer token except public health/auth status and WhatsApp webhook endpoints.

## SaaS Tenancy and Subscriptions

The backend data model is tenant-first. Operational CRM records such as users, roles, channels, customers, queues, conversations, messages, notifications, and workflows already carry `tenant_id` and remain isolated by tenant scope.

The subscription foundation extends `Tenant` with SaaS company fields:

- `logo_url`
- `status`: supports `TRIAL`, `ACTIVE`, `SUSPENDED`, and `CANCELLED` while preserving legacy `INACTIVE` and `ARCHIVED` values for compatibility
- `plan`: `STARTER`, `PROFESSIONAL`, or `ENTERPRISE`
- `subscription_start` and `subscription_end`
- `max_users`, `max_channels`, and `monthly_conversation_limit`

User ownership is prepared with `platform_role`:

- `SUPER_ADMIN`: platform owner/operator across subscribed companies
- `COMPANY_ADMIN`: administrator for a subscribed company tenant
- `COMPANY_USER`: regular company user

Current default tenant behavior remains supported. Local frontend state still starts with `default-tenant`, and the Prisma seed keeps that tenant active on the Enterprise plan. Existing WhatsApp seed/send/receive flows continue to use the same tenant and channel identifiers until a full tenant migration is introduced.

Frontend placeholders are available for SaaS platform administration:

- `/platform/companies` - الشركات المشتركة
- `/platform/subscriptions` - الاشتراكات والباقات
- `/platform/usage` - استخدام المنصة
