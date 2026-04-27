# Railway Deployment (Backend + Frontend + Postgres)

## 1) Create project and services

1. In Railway create a new project from this GitHub repository.
2. Add service `backend` with **Root Directory**: `backend`.
3. Add service `postgres` using Railway PostgreSQL template.
4. Add service `frontend` with **Root Directory**: `/` (repo root).

## 2) Backend service settings

- Build Command: `go build -o server ./cmd/server`
- Start Command: `./server`
- Healthcheck Path: `/health`

Environment variables:

- `JWT_SECRET=<strong-random-secret>`
- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `CORS_ALLOWED_ORIGINS=https://<frontend-domain>`

Note: `PORT` is automatically injected by Railway.

## 3) Frontend service settings

- Build Command: `npm install && npm run build`
- Start Command: `npx serve -s dist -l $PORT`

Environment variables:

- `VITE_API_URL=https://<backend-domain>`

The frontend now supports external API base through `VITE_API_URL`.

## 4) Apply database migrations

Open Railway Postgres SQL console and run:

```sql
\i /path/to/backend/migrations/001_create_tables.up.sql
\i /path/to/backend/migrations/002_migrate_existing_schema.up.sql
\i /path/to/backend/migrations/003_test_data.up.sql
\i /path/to/backend/migrations/004_add_mobile_group_role.sql
\i /path/to/backend/migrations/006_client_segments_and_views.up.sql
```

If SQL console does not support `\i`, paste migration files content sequentially.

## 5) Verify

1. `https://<backend-domain>/health` returns 200.
2. Frontend loads and login works.
3. Creating shipment works from frontend.
4. CORS errors are absent in browser console.
