# CargoTrans — Инструкция по запуску

## Первый запуск (только один раз)

Откройте терминал и выполните по одной команде:

```bash
psql postgres -c "CREATE ROLE postgres WITH SUPERUSER LOGIN PASSWORD 'postgres';"
psql postgres -c "CREATE DATABASE cargotrans OWNER postgres;"
cd /Users/imnotmanya/Desktop/project/backend
psql postgres://postgres:postgres@localhost:5432/cargotrans -f migrations/001_create_tables.up.sql
psql postgres://postgres:postgres@localhost:5432/cargotrans -f migrations/002_migrate_existing_schema.up.sql
psql postgres://postgres:postgres@localhost:5432/cargotrans -f migrations/003_test_data.up.sql
```

---

## Запуск каждый раз

> ⚠️ Нужно открыть **два отдельных терминала**

### Терминал 1 — Бекенд

```bash
cd /Users/imnotmanya/Desktop/project/backend
go run ./cmd/server
```

Должно появиться: `server listening on :8080`

### Терминал 2 — Фронтенд

```bash
cd /Users/imnotmanya/Desktop/project
npm run dev
```

Должно появиться: `Local: http://localhost:5173/`

Откройте браузер и перейдите на [http://localhost:5173](http://localhost:5173)

---

## Остановка

Чтобы остановить все процессы, выполните:

```bash
pkill -f "go run ./cmd/server"; kill $(lsof -ti:8080) 2>/dev/null; kill $(lsof -ti:5173) 2>/dev/null
```

---

## Подключение к БД в VS Code (SQLTools)

1. Установить расширения: **SQLTools** + **SQLTools PostgreSQL Driver**
2. Добавить подключение:
   - Host: `localhost` | Port: `5432`
   - Database: `cargotrans` | User: `postgres` | Password: `postgres`
