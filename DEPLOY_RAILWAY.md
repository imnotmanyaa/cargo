# Railway Deployment (Backend + Main Frontend + Courier Frontend + Postgres)

## 1) Create project and services (one GitHub repo)

1. In Railway create a new project from this GitHub repository.
2. Add service `backend` with **Root Directory**: `backend`.
3. Add service `postgres` using Railway PostgreSQL template.
4. Add service `frontend-main` with **Root Directory**: `/` (repo root).
5. Add service `frontend-courier` with **Root Directory**: `cargo-courier-app`.

## 2) Backend service settings

- Build Command: `go build -o server ./cmd/server`
- Start Command: `./server`
- Healthcheck Path: `/health`

Environment variables:

- `JWT_SECRET=<strong-random-secret>`
- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `CORS_ALLOWED_ORIGINS=https://<frontend-domain>`

Note: `PORT` is automatically injected by Railway.

## 3) Main frontend service settings (`frontend-main`)

- Build Command: `npm ci && npm run build`
- Start Command: `npm run preview -- --host 0.0.0.0 --port $PORT`

Environment variables:

- `VITE_API_URL=https://<backend-domain>`

The main frontend supports external API base through `VITE_API_URL`.

## 4) Courier frontend service settings (`frontend-courier`)

- Root Directory: `cargo-courier-app`
- Build Command: `npm ci && npm run build`
- Start Command: `npm run preview -- --host 0.0.0.0 --port $PORT`

Environment variables:

- `VITE_API_URL=https://<backend-domain>`

Courier app uses dedicated courier login endpoint:

- `POST /api/auth/courier/login`

## 5) CORS for two frontends

In backend service set:

- `CORS_ALLOWED_ORIGINS=https://<main-frontend-domain>,https://<courier-frontend-domain>`

## 6) Apply database migrations

Open Railway Postgres SQL console and run:

```sql
\i /path/to/backend/migrations/001_create_tables.up.sql
\i /path/to/backend/migrations/002_migrate_existing_schema.up.sql
\i /path/to/backend/migrations/003_test_data.up.sql
\i /path/to/backend/migrations/004_add_mobile_group_role.sql
\i /path/to/backend/migrations/006_client_segments_and_views.up.sql
\i /path/to/backend/migrations/007_add_door_to_door.sql
\i /path/to/backend/migrations/008_remove_train_time.sql
\i /path/to/backend/migrations/009_add_courier_role.sql
```

If SQL console does not support `\i`, paste migration files content sequentially.

## 7) Verify

1. `https://<backend-domain>/health` returns 200.
2. Main frontend loads and login works.
3. Courier frontend loads at its domain and courier login works.
4. Door-to-door flow works end-to-end:
   - individual creates door-to-door shipment
   - courier sees task and confirms pickup
   - receiver confirms final weight
5. CORS errors are absent in browser console.
