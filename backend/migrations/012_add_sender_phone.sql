-- Add sender_phone to shipments table
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS sender_phone TEXT;
-- Add index for faster lookups by phone
CREATE INDEX IF NOT EXISTS idx_shipments_sender_phone ON shipments(sender_phone);
