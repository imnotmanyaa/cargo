ALTER TABLE shipments ADD COLUMN IF NOT EXISTS courier_id UUID;

UPDATE shipments s
SET courier_id = (
  SELECT h.operator_id 
  FROM shipment_history h 
  WHERE h.shipment_id = s.id AND h.action LIKE 'Courier%' AND h.operator_id IS NOT NULL
  ORDER BY h.created_at DESC 
  LIMIT 1
)
WHERE s.courier_id IS NULL AND EXISTS (
  SELECT 1 FROM shipment_history h WHERE h.shipment_id = s.id AND h.action LIKE 'Courier%' AND h.operator_id IS NOT NULL
);
