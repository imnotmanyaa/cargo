-- Migration: Add wagon tables for MVP pilot launch
-- Run this script once against your PostgreSQL database

CREATE TABLE IF NOT EXISTS wagons (
    id              TEXT PRIMARY KEY,
    wagon_number    TEXT NOT NULL UNIQUE,
    status          TEXT NOT NULL DEFAULT 'EMPTY',
    current_station TEXT NOT NULL,
    destination     TEXT NOT NULL DEFAULT '',
    departure_date  TIMESTAMPTZ NOT NULL,
    capacity        INTEGER NOT NULL DEFAULT 100,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wagons_station ON wagons(current_station);
CREATE INDEX IF NOT EXISTS idx_wagons_status  ON wagons(status);

CREATE TABLE IF NOT EXISTS wagon_shipments (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    wagon_id    TEXT NOT NULL REFERENCES wagons(id) ON DELETE CASCADE,
    shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    status      TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | LOADED | UNLOADED | MISSING
    scanned_at  TIMESTAMPTZ,
    UNIQUE (wagon_id, shipment_id)
);

CREATE INDEX IF NOT EXISTS idx_wagon_shipments_wagon ON wagon_shipments(wagon_id);
