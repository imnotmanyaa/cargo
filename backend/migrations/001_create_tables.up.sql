-- Создание основных таблиц (из функции Migrate)
CREATE TABLE IF NOT EXISTS roles (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stations (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	city TEXT NOT NULL,
	code TEXT NOT NULL UNIQUE,
	is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	email TEXT UNIQUE NOT NULL,
	password_hash TEXT NOT NULL,
	role TEXT NOT NULL,
	company TEXT,
	deposit_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
	contract_number TEXT,
	phone TEXT,
	station TEXT,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipments (
	id TEXT PRIMARY KEY,
	shipment_number TEXT NOT NULL UNIQUE,
	client_id TEXT NOT NULL,
	client_name TEXT NOT NULL,
	client_email TEXT NOT NULL,
	from_station TEXT NOT NULL,
	to_station TEXT NOT NULL,
	current_station TEXT NOT NULL,
	next_station TEXT,
	route JSONB NOT NULL,
	status TEXT NOT NULL,
	shipment_status TEXT NOT NULL,
	payment_status TEXT NOT NULL,
	departure_date TIMESTAMPTZ NOT NULL,
	weight TEXT NOT NULL,
	dimensions TEXT NOT NULL,
	description TEXT NOT NULL,
	value TEXT NOT NULL,
	cost DOUBLE PRECISION NOT NULL DEFAULT 0,
	quantity_places INTEGER NOT NULL DEFAULT 1,
	receiver_name TEXT,
	receiver_phone TEXT,
	train_time TEXT,
	tracking_code TEXT,
	qr_code_id TEXT,
	transport_unit_id TEXT,
	last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	created_by TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
	id TEXT PRIMARY KEY,
	shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
	amount DOUBLE PRECISION NOT NULL,
	payment_method TEXT NOT NULL,
	pos_terminal_reference TEXT,
	paid_at TIMESTAMPTZ,
	confirmed_by TEXT,
	status TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qr_codes (
	id TEXT PRIMARY KEY,
	shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
	qr_value TEXT NOT NULL UNIQUE,
	generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS scan_events (
	id TEXT PRIMARY KEY,
	shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
	qr_code_id TEXT,
	event_type TEXT NOT NULL,
	station_id TEXT,
	transport_unit_id TEXT,
	user_id TEXT,
	old_status TEXT,
	new_status TEXT,
	comment TEXT,
	scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transit_events (
	id TEXT PRIMARY KEY,
	shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
	station_id TEXT NOT NULL,
	user_id TEXT,
	event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	comment TEXT
);

CREATE TABLE IF NOT EXISTS arrival_events (
	id TEXT PRIMARY KEY,
	shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
	station_id TEXT NOT NULL,
	user_id TEXT,
	event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	confirmed_as_final_arrival BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS shipment_history (
	id BIGSERIAL PRIMARY KEY,
	shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
	action TEXT NOT NULL,
	operator_id TEXT,
	operator_name TEXT,
	station TEXT,
	details TEXT NOT NULL,
	old_status TEXT,
	new_status TEXT,
	reason TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
	id TEXT PRIMARY KEY,
	user_id TEXT,
	entity_type TEXT NOT NULL,
	entity_id TEXT NOT NULL,
	action TEXT NOT NULL,
	old_value TEXT,
	new_value TEXT,
	station_id TEXT,
	reason TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
	id BIGSERIAL PRIMARY KEY,
	user_id TEXT NOT NULL,
	message TEXT NOT NULL,
	read BOOLEAN NOT NULL DEFAULT FALSE,
	type TEXT NOT NULL DEFAULT 'info',
	related_id TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
