CREATE TABLE IF NOT EXISTS frequent_clients (
	id TEXT PRIMARY KEY,
	provider TEXT NOT NULL,
	company_name TEXT,
	client_name TEXT NOT NULL,
	phone TEXT,
	contract_number TEXT,
	notes TEXT,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

