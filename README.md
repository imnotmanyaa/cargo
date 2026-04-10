# CargoTrans — Инструкция по запуску

> ⚠️ **Важно**: Все операции должны выполняться внутри папки нового проекта: `/Users/imnotmanya/Desktop/cargo-trans-mvp-figma-update`

## Запуск проекта для разработки (каждый раз)

Вам нужно открыть **два отдельных терминала**. В VS Code это можно сделать, нажав `+` в панели Terminal (Терминал).

### Терминал 1 — Бэкенд

Перейдите в папку `backend` и запустите сервер:

```bash
cd /Users/imnotmanya/Desktop/cargo-trans-mvp-figma-update/backend
go run ./cmd/server
```

Должно появиться: `server listening on :8080`.
*Не закрывайте этот терминал, пока работаете.*

### Терминал 2 — Фронтенд

Убедитесь, что вы находитесь в корне новой папки:

```bash
cd /Users/imnotmanya/Desktop/cargo-trans-mvp-figma-update
npm run dev
```

Должно появиться: `Local: http://localhost:5173/`

Откройте браузер и перейдите по ссылке [http://localhost:5173](http://localhost:5173).

---

## Первый запуск / Пересоздание базы данных (если нужно)

Если вы запускаете проект с нуля на новом компьютере или вам нужно пересоздать данные:

```bash
cd /Users/imnotmanya/Desktop/cargo-trans-mvp-figma-update

# 1. Создание роли и базы данных (выдаст ошибку "already exists", если уже есть, это нормально)
psql postgres -c "CREATE ROLE postgres WITH SUPERUSER LOGIN PASSWORD 'postgres';"
psql postgres -c "CREATE DATABASE cargotrans OWNER postgres;"

# 2. Накатываем структуру и тестовые данные (включая все новые роли)
psql postgres://postgres:postgres@localhost:5432/cargotrans -f backend/migrations/001_create_tables.up.sql
psql postgres://postgres:postgres@localhost:5432/cargotrans -f backend/migrations/002_migrate_existing_schema.up.sql
psql postgres://postgres:postgres@localhost:5432/cargotrans -f backend/migrations/003_test_data.up.sql
psql postgres://postgres:postgres@localhost:5432/cargotrans -f backend/migrations/004_add_mobile_group_role.sql
```

---

## Остановка серверов

Чтобы сразу выключить запущенные ранее процессы (если порты оказались заняты), выполните:

```bash
pkill -f "go run ./cmd/server"; kill $(lsof -ti:8080) 2>/dev/null; kill $(lsof -ti:5173) 2>/dev/null
```

---

## Подключение к БД в VS Code (SQLTools)

1. Установить расширения: **SQLTools** + **SQLTools PostgreSQL Driver**
2. Добавить подключение:
   - Host: `localhost` | Port: `5432`
   - Database: `cargotrans` | User: `postgres` | Password: `postgres`
