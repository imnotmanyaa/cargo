-- Disallow creating shipments with identical origin/destination station.
-- Normalizes by trimming spaces and comparing case-insensitively.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shipments_from_to_station_check'
  ) THEN
    ALTER TABLE shipments
      ADD CONSTRAINT shipments_from_to_station_check
      CHECK (lower(btrim(from_station)) <> lower(btrim(to_station)));
  END IF;
END
$$;

