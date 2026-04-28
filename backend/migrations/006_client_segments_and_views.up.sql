-- Сегменты данных в одной БД cargotrans: staff | individual | legal_entity (юрлица + быстрые клиенты).
-- В DBeaver смотри представления v_clients_*.

ALTER TABLE users ADD COLUMN IF NOT EXISTS client_segment TEXT NOT NULL DEFAULT 'staff';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_client_segment_check;
ALTER TABLE users ADD CONSTRAINT users_client_segment_check
  CHECK (client_segment IN ('legal_entity', 'individual', 'staff'));

UPDATE users SET client_segment = CASE
  WHEN role = 'corporate' THEN 'legal_entity'
  WHEN role = 'individual' THEN 'individual'
  ELSE 'staff'
END;

ALTER TABLE frequent_clients ADD COLUMN IF NOT EXISTS client_segment TEXT NOT NULL DEFAULT 'legal_entity';

ALTER TABLE frequent_clients DROP CONSTRAINT IF EXISTS frequent_clients_client_segment_check;
ALTER TABLE frequent_clients ADD CONSTRAINT frequent_clients_client_segment_check
  CHECK (client_segment = 'legal_entity');

-- Представления для удобного просмотра «три мира»
CREATE OR REPLACE VIEW v_clients_staff AS
  SELECT * FROM users WHERE client_segment = 'staff';

CREATE OR REPLACE VIEW v_clients_individual AS
  SELECT * FROM users WHERE client_segment = 'individual';

CREATE OR REPLACE VIEW v_clients_legal_users AS
  SELECT * FROM users WHERE client_segment = 'legal_entity';

CREATE OR REPLACE VIEW v_clients_legal_frequent AS
  SELECT * FROM frequent_clients WHERE client_segment = 'legal_entity';
