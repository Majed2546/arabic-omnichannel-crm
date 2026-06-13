# Production Docker Infrastructure

This stack runs the Arabic Omnichannel CRM with a production Vite frontend, NestJS backend, PostgreSQL, Redis, and an edge nginx reverse proxy.

## Services

- `frontend`: builds the React/Vite app and serves static assets with nginx.
- `backend`: runs the NestJS API on internal port `4000` and loads `backend/.env`.
- `postgres`: PostgreSQL 16 with persistent storage.
- `redis`: Redis 7 with persistent append-only storage.
- `nginx`: public reverse proxy for the frontend, `/api`, and `/socket.io`.

## Environment

The backend container loads `backend/.env`. Compose also sets container service addresses:

- `DATABASE_URL=postgresql://...@postgres:5432/...`
- `REDIS_HOST=redis`
- `REDIS_PORT=6379`
- `PORT=4000`

Override production values from the shell or a Compose environment file before deployment:

```bash
export POSTGRES_DB=arabic_omnichannel_crm
export POSTGRES_USER=omni
export POSTGRES_PASSWORD='change-me'
export HTTP_PORT=80
export SOCKET_IO_CORS_ORIGIN='https://crm.example.com'
```

Keep WhatsApp, JWT, and other application secrets in `backend/.env` or your deployment secret manager.

## Run

```bash
docker compose config
docker compose up -d --build
```

Health checks:

```bash
curl http://localhost/health
curl http://localhost/api/health
```

## Routing

- `/` serves the frontend.
- `/api/*` is proxied to the NestJS backend with the `/api` prefix stripped.
- `/socket.io/*` is proxied to the NestJS Socket.io server with WebSocket upgrade headers.

## Persistence

Data is stored in named volumes:

- `postgres_data`
- `redis_data`

Back up these volumes before upgrades or destructive maintenance.
