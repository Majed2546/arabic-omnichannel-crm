# Arabic Omnichannel CRM

Modern Arabic RTL SaaS frontend for an omnichannel CRM platform.

## Stack

- React + TypeScript
- Vite
- Apollo Client GraphQL setup
- Zustand UI store
- Feature-based folder structure
- Direct Twenty GraphQL connection

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

## Twenty GraphQL

The frontend reads `VITE_GRAPHQL_API_URL` from `.env` and defaults to:

```bash
VITE_TWENTY_GRAPHQL_URL=http://localhost:3000/graphql
```

To read real Twenty records from the browser, add a Twenty API key:

```bash
VITE_TWENTY_API_KEY=your_twenty_api_key
```
