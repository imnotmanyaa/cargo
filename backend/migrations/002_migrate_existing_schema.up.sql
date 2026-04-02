-- Добавление колонок, которые могли отсутствовать (из migrateExistingSchema)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shipment_number TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shipment_status TEXT NOT NULL DEFAULT 'CREATED';
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'UNPAID';
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS quantity_places INTEGER NOT NULL DEFAULT 1;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS tracking_code TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS qr_code_id TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS transport_unit_id TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS cost DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS receiver_name TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS receiver_phone TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS train_time TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS route JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE shipment_history ADD COLUMN IF NOT EXISTS reason TEXT;

-- Обновление существующих записей shipments для заполнения полей по умолчанию
UPDATE shipments
SET
    shipment_number = COALESCE(shipment_number, id),
    tracking_code = COALESCE(tracking_code, id),
    shipment_status = COALESCE(NULLIF(shipment_status, ''), CASE
        WHEN status = 'Погружен' THEN 'LOADED'
        WHEN status = 'В пути' THEN 'IN_TRANSIT'
        WHEN status = 'Прибыл' THEN 'ARRIVED'
        WHEN status = 'Выдан' THEN 'ISSUED'
        WHEN status = 'Закрыт' THEN 'CLOSED'
        ELSE 'CREATED'
    END),
    payment_status = COALESCE(NULLIF(payment_status, ''), 'UNPAID'),
    last_updated_at = COALESCE(last_updated_at, NOW()),
    updated_at = COALESCE(updated_at, NOW());