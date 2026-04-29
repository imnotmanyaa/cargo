INSERT INTO roles (id, name, description)
VALUES (
  'courier',
  'courier',
  'Courier mobile app operator for door-to-door pickups'
)
ON CONFLICT (id) DO NOTHING;
