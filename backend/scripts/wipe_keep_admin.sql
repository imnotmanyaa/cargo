-- ОПАСНО: удаляет все операционные данные, оставляет только пользователя admin@cargotrans.kz
-- Справочники roles и stations не трогает.
-- Запуск (пример):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/scripts/wipe_keep_admin.sql

BEGIN;

DELETE FROM wagon_shipments;
DELETE FROM wagons;
DELETE FROM shipments;
DELETE FROM notifications;
DELETE FROM audit_log;
DELETE FROM frequent_clients;

DELETE FROM users
WHERE lower(btrim(email)) IS DISTINCT FROM lower(btrim('admin@cargotrans.kz'));

UPDATE users SET client_segment = 'staff' WHERE lower(btrim(email)) = lower(btrim('admin@cargotrans.kz'));

COMMIT;
