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
