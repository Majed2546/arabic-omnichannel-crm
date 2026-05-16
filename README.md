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
