-- Add door-to-door delivery fields to shipments table
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS is_door_to_door BOOLEAN DEFAULT FALSE;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS pickup_address TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS door_to_door_phone TEXT;
