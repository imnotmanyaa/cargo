# CargoTrans Backend

Go backend for CargoTrans, using PostgreSQL instead of SQLite while keeping the `/api/...` contract expected by the current frontend and adding the remaining pilot APIs.

## Structure

- `cmd/server`: application entrypoint
- `internal/api`: HTTP handlers split by domain
- `internal/service`: application/use-case layer split by domain
- `internal/storage/postgres`: PostgreSQL adapters and schema bootstrap
- `internal/model`: domain models
- `postman`: importable Postman collection and environment

## Run locally

With Docker:

```bash
docker compose up --build
```

The API will be available at `http://localhost:8080` and PostgreSQL at `localhost:5432`.

Without Docker:

1. Start PostgreSQL.
2. Set env vars if needed:

```bash
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/cargotrans?sslmode=disable"
export JWT_SECRET="dev-secret"
export PORT="8080"
# Optional: comma-separated browser origins (production). Default * = allow all (dev only).
# export CORS_ALLOWED_ORIGINS="http://localhost:5173,http://141.148.236.58"

## Где лежат данные

Одна база PostgreSQL с именем **`cargotrans`** (на сервере — обычно `localhost:5432` у того же хоста, что и API). Логическое разделение: поле **`users.client_segment`** (`staff` | `individual` | `legal_entity`) и **`frequent_clients.client_segment`** (всегда `legal_entity`). В DBeaver удобно открыть представления **`v_clients_staff`**, **`v_clients_individual`**, **`v_clients_legal_users`**, **`v_clients_legal_frequent`** (после миграции `006_client_segments_and_views.up.sql`).

Очистка всех данных кроме `admin@cargotrans.kz` — только вручную: `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/scripts/wipe_keep_admin.sql`.
```

3. Run the server:

```bash
go run ./cmd/server
```

## Test

```bash
go test ./...
```

## Postman

Import:

- `postman/cargotrans.postman_collection.json`
- `postman/cargotrans.postman_environment.json`
