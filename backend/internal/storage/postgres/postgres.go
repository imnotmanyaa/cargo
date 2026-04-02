package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"cargo/backend/internal/model"
	"cargo/backend/internal/service"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	pool *pgxpool.Pool
}

func Open(databaseURL string) (*DB, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return &DB{pool: pool}, nil
}

func (db *DB) Pool() *pgxpool.Pool { return db.pool }
func (db *DB) Close()              { db.pool.Close() }

// func (db *DB) Migrate() error {
// 	schema := `
// CREATE TABLE IF NOT EXISTS roles (
// 	id TEXT PRIMARY KEY,
// 	name TEXT NOT NULL UNIQUE,
// 	description TEXT NOT NULL
// );
// CREATE TABLE IF NOT EXISTS stations (
// 	id TEXT PRIMARY KEY,
// 	name TEXT NOT NULL UNIQUE,
// 	city TEXT NOT NULL,
// 	code TEXT NOT NULL UNIQUE,
// 	is_active BOOLEAN NOT NULL DEFAULT TRUE
// );
// CREATE TABLE IF NOT EXISTS users (
// 	id TEXT PRIMARY KEY,
// 	name TEXT NOT NULL,
// 	email TEXT UNIQUE NOT NULL,
// 	password_hash TEXT NOT NULL,
// 	role TEXT NOT NULL,
// 	company TEXT,
// 	deposit_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
// 	contract_number TEXT,
// 	phone TEXT,
// 	station TEXT,
// 	is_active BOOLEAN NOT NULL DEFAULT TRUE,
// 	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
// );
// CREATE TABLE IF NOT EXISTS shipments (
// 	id TEXT PRIMARY KEY,
// 	shipment_number TEXT NOT NULL UNIQUE,
// 	client_id TEXT NOT NULL,
// 	client_name TEXT NOT NULL,
// 	client_email TEXT NOT NULL,
// 	from_station TEXT NOT NULL,
// 	to_station TEXT NOT NULL,
// 	current_station TEXT NOT NULL,
// 	next_station TEXT,
// 	route JSONB NOT NULL,
// 	status TEXT NOT NULL,
// 	shipment_status TEXT NOT NULL,
// 	payment_status TEXT NOT NULL,
// 	departure_date TIMESTAMPTZ NOT NULL,
// 	weight TEXT NOT NULL,
// 	dimensions TEXT NOT NULL,
// 	description TEXT NOT NULL,
// 	value TEXT NOT NULL,
// 	cost DOUBLE PRECISION NOT NULL DEFAULT 0,
// 	quantity_places INTEGER NOT NULL DEFAULT 1,
// 	receiver_name TEXT,
// 	receiver_phone TEXT,
// 	train_time TEXT,
// 	tracking_code TEXT,
// 	qr_code_id TEXT,
// 	transport_unit_id TEXT,
// 	last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
// 	created_by TEXT,
// 	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
// 	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
// );
// CREATE TABLE IF NOT EXISTS payments (
// 	id TEXT PRIMARY KEY,
// 	shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
// 	amount DOUBLE PRECISION NOT NULL,
// 	payment_method TEXT NOT NULL,
// 	pos_terminal_reference TEXT,
// 	paid_at TIMESTAMPTZ,
// 	confirmed_by TEXT,
// 	status TEXT NOT NULL,
// 	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
// );
// CREATE TABLE IF NOT EXISTS qr_codes (
// 	id TEXT PRIMARY KEY,
// 	shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
// 	qr_value TEXT NOT NULL UNIQUE,
// 	generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
// 	is_active BOOLEAN NOT NULL DEFAULT TRUE
// );
// CREATE TABLE IF NOT EXISTS scan_events (
// 	id TEXT PRIMARY KEY,
// 	shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
// 	qr_code_id TEXT,
// 	event_type TEXT NOT NULL,
// 	station_id TEXT,
// 	transport_unit_id TEXT,
// 	user_id TEXT,
// 	old_status TEXT,
// 	new_status TEXT,
// 	comment TEXT,
// 	scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
// );
// CREATE TABLE IF NOT EXISTS transit_events (
// 	id TEXT PRIMARY KEY,
// 	shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
// 	station_id TEXT NOT NULL,
// 	user_id TEXT,
// 	event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
// 	comment TEXT
// );
// CREATE TABLE IF NOT EXISTS arrival_events (
// 	id TEXT PRIMARY KEY,
// 	shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
// 	station_id TEXT NOT NULL,
// 	user_id TEXT,
// 	event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
// 	confirmed_as_final_arrival BOOLEAN NOT NULL DEFAULT TRUE
// );
// CREATE TABLE IF NOT EXISTS shipment_history (
// 	id BIGSERIAL PRIMARY KEY,
// 	shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
// 	action TEXT NOT NULL,
// 	operator_id TEXT,
// 	operator_name TEXT,
// 	station TEXT,
// 	details TEXT NOT NULL,
// 	old_status TEXT,
// 	new_status TEXT,
// 	reason TEXT,
// 	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
// );
// CREATE TABLE IF NOT EXISTS audit_log (
// 	id TEXT PRIMARY KEY,
// 	user_id TEXT,
// 	entity_type TEXT NOT NULL,
// 	entity_id TEXT NOT NULL,
// 	action TEXT NOT NULL,
// 	old_value TEXT,
// 	new_value TEXT,
// 	station_id TEXT,
// 	reason TEXT,
// 	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
// );
// CREATE TABLE IF NOT EXISTS notifications (
// 	id BIGSERIAL PRIMARY KEY,
// 	user_id TEXT NOT NULL,
// 	message TEXT NOT NULL,
// 	read BOOLEAN NOT NULL DEFAULT FALSE,
// 	type TEXT NOT NULL DEFAULT 'info',
// 	related_id TEXT,
// 	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
// );`

// 	ctx := context.Background()
// 	if _, err := db.pool.Exec(ctx, schema); err != nil {
// 		return err
// 	}
// 	if err := db.migrateExistingSchema(ctx); err != nil {
// 		return err
// 	}
// 	return db.seedReferenceData(ctx)
// }

// func (db *DB) migrateExistingSchema(ctx context.Context) error {
// 	statements := []string{
// 		`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`,
// 		`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shipment_number TEXT`,
// 		`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shipment_status TEXT NOT NULL DEFAULT 'CREATED'`,
// 		`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'UNPAID'`,
// 		`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS quantity_places INTEGER NOT NULL DEFAULT 1`,
// 		`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS tracking_code TEXT`,
// 		`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS qr_code_id TEXT`,
// 		`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS transport_unit_id TEXT`,
// 		`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
// 		`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS created_by TEXT`,
// 		`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
// 		`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS cost DOUBLE PRECISION NOT NULL DEFAULT 0`,
// 		`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS receiver_name TEXT`,
// 		`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS receiver_phone TEXT`,
// 		`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS train_time TEXT`,
// 		`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS route JSONB NOT NULL DEFAULT '[]'::jsonb`,
// 		`CREATE TABLE IF NOT EXISTS payments (
// 			id TEXT PRIMARY KEY,
// 			shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
// 			amount DOUBLE PRECISION NOT NULL,
// 			payment_method TEXT NOT NULL,
// 			pos_terminal_reference TEXT,
// 			paid_at TIMESTAMPTZ,
// 			confirmed_by TEXT,
// 			status TEXT NOT NULL,
// 			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
// 		)`,
// 		`CREATE TABLE IF NOT EXISTS qr_codes (
// 			id TEXT PRIMARY KEY,
// 			shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
// 			qr_value TEXT NOT NULL UNIQUE,
// 			generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
// 			is_active BOOLEAN NOT NULL DEFAULT TRUE
// 		)`,
// 		`CREATE TABLE IF NOT EXISTS scan_events (
// 			id TEXT PRIMARY KEY,
// 			shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
// 			qr_code_id TEXT,
// 			event_type TEXT NOT NULL,
// 			station_id TEXT,
// 			transport_unit_id TEXT,
// 			user_id TEXT,
// 			old_status TEXT,
// 			new_status TEXT,
// 			comment TEXT,
// 			scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
// 		)`,
// 		`CREATE TABLE IF NOT EXISTS transit_events (
// 			id TEXT PRIMARY KEY,
// 			shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
// 			station_id TEXT NOT NULL,
// 			user_id TEXT,
// 			event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
// 			comment TEXT
// 		)`,
// 		`CREATE TABLE IF NOT EXISTS arrival_events (
// 			id TEXT PRIMARY KEY,
// 			shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
// 			station_id TEXT NOT NULL,
// 			user_id TEXT,
// 			event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
// 			confirmed_as_final_arrival BOOLEAN NOT NULL DEFAULT TRUE
// 		)`,
// 		`CREATE TABLE IF NOT EXISTS audit_log (
// 			id TEXT PRIMARY KEY,
// 			user_id TEXT,
// 			entity_type TEXT NOT NULL,
// 			entity_id TEXT NOT NULL,
// 			action TEXT NOT NULL,
// 			old_value TEXT,
// 			new_value TEXT,
// 			station_id TEXT,
// 			reason TEXT,
// 			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
// 		)`,
// 		`ALTER TABLE shipment_history ADD COLUMN IF NOT EXISTS reason TEXT`,
// 	}
// 	for _, stmt := range statements {
// 		if _, err := db.pool.Exec(ctx, stmt); err != nil {
// 			return err
// 		}
// 	}
// 	_, err := db.pool.Exec(ctx, `
// 		UPDATE shipments
// 		SET
// 			shipment_number = COALESCE(shipment_number, id),
// 			tracking_code = COALESCE(tracking_code, id),
// 			shipment_status = COALESCE(NULLIF(shipment_status, ''), CASE
// 				WHEN status = 'Погружен' THEN 'LOADED'
// 				WHEN status = 'В пути' THEN 'IN_TRANSIT'
// 				WHEN status = 'Прибыл' THEN 'ARRIVED'
// 				WHEN status = 'Выдан' THEN 'ISSUED'
// 				WHEN status = 'Закрыт' THEN 'CLOSED'
// 				ELSE 'CREATED'
// 			END),
// 			payment_status = COALESCE(NULLIF(payment_status, ''), 'UNPAID'),
// 			last_updated_at = COALESCE(last_updated_at, NOW()),
// 			updated_at = COALESCE(updated_at, NOW())
// 	`)
// 	return err
// }

// func (db *DB) seedReferenceData(ctx context.Context) error {
// 	roleInserts := []model.RoleRecord{
// 		{ID: "admin", Name: "admin", Description: "Administrator"},
// 		{ID: "manager", Name: "manager", Description: "Manager"},
// 		{ID: "operator", Name: "operator", Description: "Reception operator"},
// 		{ID: "receiver", Name: "receiver", Description: "Destination receiver"},
// 		{ID: "loading_operator", Name: "loading_operator", Description: "Loading employee"},
// 		{ID: "transit_operator", Name: "transit_operator", Description: "Transit operator"},
// 		{ID: "issue_operator", Name: "issue_operator", Description: "Issue operator"},
// 		{ID: "accounting", Name: "accounting", Description: "Accounting"},
// 		{ID: "individual", Name: "individual", Description: "Individual client"},
// 		{ID: "corporate", Name: "corporate", Description: "Corporate client"},
// 	}
// 	for _, role := range roleInserts {
// 		if _, err := db.pool.Exec(ctx, `INSERT INTO roles (id, name, description) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING`, role.ID, role.Name, role.Description); err != nil {
// 			return err
// 		}
// 	}
// 	stations := []model.Station{
// 		{ID: "shymkent", Name: "Шымкент", City: "Шымкент", Code: "CIT-SHYM", IsActive: true},
// 		{ID: "almaty-1", Name: "Алматы-1", City: "Алматы", Code: "CIT-ALA1", IsActive: true},
// 		{ID: "karaganda", Name: "Қарағанды", City: "Қарағанды", Code: "CIT-KRG", IsActive: true},
// 		{ID: "astana", Name: "Астана Нұрлы Жол", City: "Астана", Code: "CIT-AST", IsActive: true},
// 		{ID: "aktobe", Name: "Ақтөбе", City: "Ақтөбе", Code: "CIT-AKT", IsActive: true},
// 	}
// 	for _, station := range stations {
// 		if _, err := db.pool.Exec(ctx, `INSERT INTO stations (id, name, city, code, is_active) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`, station.ID, station.Name, station.City, station.Code, station.IsActive); err != nil {
// 			return err
// 		}
// 	}
// 	return nil
// }

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) CreateUser(ctx context.Context, user model.User) (model.User, error) {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO users (id, name, email, password_hash, role, company, deposit_balance, contract_number, phone, station, is_active, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
	`, user.ID, user.Name, user.Email, user.PasswordHash, user.Role, user.Company, user.DepositBalance, user.ContractNumber, user.Phone, user.Station, user.IsActive, user.CreatedAt)
	if err != nil {
		return model.User{}, err
	}
	return user, nil
}

func (r *Repository) UpdateUser(ctx context.Context, user model.User) (model.User, error) {
	_, err := r.pool.Exec(ctx, `
		UPDATE users SET name = $2, email = $3, role = $4, company = $5, deposit_balance = $6, contract_number = $7, phone = $8, station = $9, is_active = $10
		WHERE id = $1
	`, user.ID, user.Name, user.Email, user.Role, user.Company, user.DepositBalance, user.ContractNumber, user.Phone, user.Station, user.IsActive)
	if err != nil {
		return model.User{}, err
	}
	return user, nil
}

func (r *Repository) GetUserByEmail(ctx context.Context, email string) (model.User, error) {
	return scanUser(r.pool.QueryRow(ctx, userSelect+` WHERE email = $1`, email))
}

func (r *Repository) GetUserByID(ctx context.Context, id string) (model.User, error) {
	return scanUser(r.pool.QueryRow(ctx, userSelect+` WHERE id = $1`, id))
}

func (r *Repository) ListUsers(ctx context.Context) ([]model.User, error) {
	rows, err := r.pool.Query(ctx, userSelect+` ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectUsers(rows)
}

func (r *Repository) ListEmployees(ctx context.Context) ([]model.User, error) {
	rows, err := r.pool.Query(ctx, userSelect+` WHERE role IN ('admin','manager','operator','receiver','loading_operator','transit_operator','issue_operator','accounting') ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectUsers(rows)
}

func (r *Repository) CreateEmployee(ctx context.Context, user model.User) (model.User, error) {
	return r.CreateUser(ctx, user)
}

func (r *Repository) DeleteEmployee(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, id)
	return err
}

func (r *Repository) ListCorporateClients(ctx context.Context) ([]model.User, error) {
	rows, err := r.pool.Query(ctx, userSelect+` WHERE role = 'corporate' ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectUsers(rows)
}

func (r *Repository) TopUpDeposit(ctx context.Context, userID string, amount float64) (float64, error) {
	var balance float64
	err := r.pool.QueryRow(ctx, `UPDATE users SET deposit_balance = deposit_balance + $2 WHERE id = $1 RETURNING deposit_balance`, userID, amount).Scan(&balance)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, service.ErrNotFound
	}
	return balance, err
}

func (r *Repository) ListRoles(ctx context.Context) ([]model.RoleRecord, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, name, description FROM roles ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var roles []model.RoleRecord
	for rows.Next() {
		var role model.RoleRecord
		if err := rows.Scan(&role.ID, &role.Name, &role.Description); err != nil {
			return nil, err
		}
		roles = append(roles, role)
	}
	return roles, rows.Err()
}

func (r *Repository) ListStations(ctx context.Context) ([]model.Station, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, name, city, code, is_active FROM stations ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var stations []model.Station
	for rows.Next() {
		var station model.Station
		if err := rows.Scan(&station.ID, &station.Name, &station.City, &station.Code, &station.IsActive); err != nil {
			return nil, err
		}
		stations = append(stations, station)
	}
	return stations, rows.Err()
}

func (r *Repository) CreateStation(ctx context.Context, station model.Station) (model.Station, error) {
	_, err := r.pool.Exec(ctx, `INSERT INTO stations (id, name, city, code, is_active) VALUES ($1,$2,$3,$4,$5)`, station.ID, station.Name, station.City, station.Code, station.IsActive)
	return station, err
}

func (r *Repository) UpdateStation(ctx context.Context, station model.Station) (model.Station, error) {
	_, err := r.pool.Exec(ctx, `UPDATE stations SET name = $2, city = $3, code = $4, is_active = $5 WHERE id = $1`, station.ID, station.Name, station.City, station.Code, station.IsActive)
	return station, err
}

func (r *Repository) CreateShipment(ctx context.Context, shipment model.Shipment) (model.Shipment, error) {
	routeJSON, _ := json.Marshal(shipment.Route)
	_, err := r.pool.Exec(ctx, `
		INSERT INTO shipments (
			id, shipment_number, client_id, client_name, client_email, from_station, to_station, current_station, next_station, route,
			status, shipment_status, payment_status, departure_date, weight, dimensions, description, value, cost, quantity_places,
			receiver_name, receiver_phone, train_time, tracking_code, qr_code_id, transport_unit_id, last_updated_at, created_by, created_at, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
			$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
			$21,$22,$23,$24,$25,$26,$27,$28,$29,$30
		)
	`, shipment.ID, shipment.ShipmentNumber, shipment.ClientID, shipment.ClientName, shipment.ClientEmail, shipment.FromStation, shipment.ToStation, shipment.CurrentStation, shipment.NextStation, routeJSON, shipment.Status, shipment.ShipmentStatus, shipment.PaymentStatus, shipment.DepartureDate, shipment.Weight, shipment.Dimensions, shipment.Description, shipment.Value, shipment.Cost, shipment.QuantityPlaces, shipment.ReceiverName, shipment.ReceiverPhone, shipment.TrainTime, shipment.TrackingCode, shipment.QRCodeID, shipment.TransportUnitID, shipment.LastUpdatedAt, shipment.CreatedBy, shipment.CreatedAt, shipment.UpdatedAt)
	return shipment, err
}

func (r *Repository) GetShipmentByID(ctx context.Context, id string) (model.Shipment, error) {
	return scanShipment(r.pool.QueryRow(ctx, shipmentSelect+` WHERE id = $1`, id))
}

func (r *Repository) GetShipmentByTrackingCode(ctx context.Context, code string) (model.Shipment, error) {
	return scanShipment(r.pool.QueryRow(ctx, shipmentSelect+` WHERE tracking_code = $1 OR shipment_number = $1`, code))
}

func (r *Repository) ListShipments(ctx context.Context, filter model.ShipmentFilter) ([]model.Shipment, error) {
	query := shipmentSelect
	args := []any{}
	where := ""
	switch filter.Type {
	case "incoming":
		where = ` WHERE next_station = $1`
		args = append(args, filter.Station)
	case "outgoing":
		where = ` WHERE current_station = $1 AND shipment_status IN ('READY_FOR_LOADING','LOADED','IN_TRANSIT')`
		args = append(args, filter.Station)
	case "arrived":
		where = ` WHERE current_station = $1 AND shipment_status = 'ARRIVED'`
		args = append(args, filter.Station)
	default:
		if filter.ClientID != "" {
			where = ` WHERE client_id = $1`
			args = append(args, filter.ClientID)
		}
	}
	rows, err := r.pool.Query(ctx, query+where+` ORDER BY created_at DESC`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectShipments(rows)
}

func (r *Repository) ListShipmentsByOriginStation(ctx context.Context, station string) ([]model.Shipment, error) {
	rows, err := r.pool.Query(ctx, shipmentSelect+` WHERE from_station = $1 ORDER BY created_at DESC`, station)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectShipments(rows)
}

func (r *Repository) UpdateShipment(ctx context.Context, shipment model.Shipment) (model.Shipment, error) {
	routeJSON, _ := json.Marshal(shipment.Route)
	_, err := r.pool.Exec(ctx, `
		UPDATE shipments SET
			shipment_number = $2,
			client_id = $3,
			client_name = $4,
			client_email = $5,
			from_station = $6,
			to_station = $7,
			current_station = $8,
			next_station = $9,
			route = $10,
			status = $11,
			shipment_status = $12,
			payment_status = $13,
			departure_date = $14,
			weight = $15,
			dimensions = $16,
			description = $17,
			value = $18,
			cost = $19,
			quantity_places = $20,
			receiver_name = $21,
			receiver_phone = $22,
			train_time = $23,
			tracking_code = $24,
			qr_code_id = $25,
			transport_unit_id = $26,
			last_updated_at = $27,
			created_by = $28,
			updated_at = $29
		WHERE id = $1
	`, shipment.ID, shipment.ShipmentNumber, shipment.ClientID, shipment.ClientName, shipment.ClientEmail, shipment.FromStation, shipment.ToStation, shipment.CurrentStation, shipment.NextStation, routeJSON, shipment.Status, shipment.ShipmentStatus, shipment.PaymentStatus, shipment.DepartureDate, shipment.Weight, shipment.Dimensions, shipment.Description, shipment.Value, shipment.Cost, shipment.QuantityPlaces, shipment.ReceiverName, shipment.ReceiverPhone, shipment.TrainTime, shipment.TrackingCode, shipment.QRCodeID, shipment.TransportUnitID, shipment.LastUpdatedAt, shipment.CreatedBy, shipment.UpdatedAt)
	return shipment, err
}

func (r *Repository) AddShipmentHistory(ctx context.Context, history model.ShipmentHistory) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO shipment_history (shipment_id, action, operator_id, operator_name, station, details, old_status, new_status, reason, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, history.ShipmentID, history.Action, history.OperatorID, history.OperatorName, history.Station, history.Details, history.OldStatus, history.NewStatus, history.Reason, history.CreatedAt)
	return err
}

func (r *Repository) ListShipmentHistory(ctx context.Context, shipmentID string) ([]model.ShipmentHistory, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, shipment_id, action, operator_id, operator_name, station, details, old_status, new_status, reason, created_at FROM shipment_history WHERE shipment_id = $1 ORDER BY created_at ASC`, shipmentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []model.ShipmentHistory
	for rows.Next() {
		var item model.ShipmentHistory
		if err := rows.Scan(&item.ID, &item.ShipmentID, &item.Action, &item.OperatorID, &item.OperatorName, &item.Station, &item.Details, &item.OldStatus, &item.NewStatus, &item.Reason, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) CreatePayment(ctx context.Context, payment model.Payment) (model.Payment, error) {
	_, err := r.pool.Exec(ctx, `INSERT INTO payments (id, shipment_id, amount, payment_method, pos_terminal_reference, paid_at, confirmed_by, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, payment.ID, payment.ShipmentID, payment.Amount, payment.PaymentMethod, payment.POSReference, payment.PaidAt, payment.ConfirmedBy, payment.Status, payment.CreatedAt)
	return payment, err
}

func (r *Repository) GetPayment(ctx context.Context, id string) (model.Payment, error) {
	var payment model.Payment
	err := r.pool.QueryRow(ctx, `SELECT id, shipment_id, amount, payment_method, pos_terminal_reference, paid_at, confirmed_by, status, created_at FROM payments WHERE id = $1`, id).Scan(&payment.ID, &payment.ShipmentID, &payment.Amount, &payment.PaymentMethod, &payment.POSReference, &payment.PaidAt, &payment.ConfirmedBy, &payment.Status, &payment.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return model.Payment{}, service.ErrNotFound
	}
	return payment, err
}

func (r *Repository) ListPaymentsByShipment(ctx context.Context, shipmentID string) ([]model.Payment, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, shipment_id, amount, payment_method, pos_terminal_reference, paid_at, confirmed_by, status, created_at FROM payments WHERE shipment_id = $1 ORDER BY created_at ASC`, shipmentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []model.Payment
	for rows.Next() {
		var payment model.Payment
		if err := rows.Scan(&payment.ID, &payment.ShipmentID, &payment.Amount, &payment.PaymentMethod, &payment.POSReference, &payment.PaidAt, &payment.ConfirmedBy, &payment.Status, &payment.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, payment)
	}
	return items, rows.Err()
}

func (r *Repository) UpdatePayment(ctx context.Context, payment model.Payment) (model.Payment, error) {
	_, err := r.pool.Exec(ctx, `UPDATE payments SET amount = $2, payment_method = $3, pos_terminal_reference = $4, paid_at = $5, confirmed_by = $6, status = $7 WHERE id = $1`, payment.ID, payment.Amount, payment.PaymentMethod, payment.POSReference, payment.PaidAt, payment.ConfirmedBy, payment.Status)
	return payment, err
}

func (r *Repository) CreateQRCode(ctx context.Context, code model.QRCode) (model.QRCode, error) {
	_, err := r.pool.Exec(ctx, `INSERT INTO qr_codes (id, shipment_id, qr_value, generated_at, is_active) VALUES ($1,$2,$3,$4,$5)`, code.ID, code.ShipmentID, code.QRValue, code.GeneratedAt, code.IsActive)
	return code, err
}

func (r *Repository) GetQRCodeByShipment(ctx context.Context, shipmentID string) (model.QRCode, error) {
	var code model.QRCode
	err := r.pool.QueryRow(ctx, `SELECT id, shipment_id, qr_value, generated_at, is_active FROM qr_codes WHERE shipment_id = $1 ORDER BY generated_at DESC LIMIT 1`, shipmentID).Scan(&code.ID, &code.ShipmentID, &code.QRValue, &code.GeneratedAt, &code.IsActive)
	if errors.Is(err, pgx.ErrNoRows) {
		return model.QRCode{}, service.ErrNotFound
	}
	return code, err
}

func (r *Repository) CreateScanEvent(ctx context.Context, event model.ScanEvent) (model.ScanEvent, error) {
	_, err := r.pool.Exec(ctx, `INSERT INTO scan_events (id, shipment_id, qr_code_id, event_type, station_id, transport_unit_id, user_id, old_status, new_status, comment, scanned_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, event.ID, event.ShipmentID, event.QRCodeID, event.EventType, event.StationID, event.TransportUnitID, event.UserID, event.OldStatus, event.NewStatus, event.Comment, event.ScannedAt)
	return event, err
}

func (r *Repository) ListScanEvents(ctx context.Context, shipmentID string) ([]model.ScanEvent, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, shipment_id, qr_code_id, event_type, station_id, transport_unit_id, user_id, old_status, new_status, comment, scanned_at FROM scan_events WHERE shipment_id = $1 ORDER BY scanned_at ASC`, shipmentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []model.ScanEvent
	for rows.Next() {
		var event model.ScanEvent
		if err := rows.Scan(&event.ID, &event.ShipmentID, &event.QRCodeID, &event.EventType, &event.StationID, &event.TransportUnitID, &event.UserID, &event.OldStatus, &event.NewStatus, &event.Comment, &event.ScannedAt); err != nil {
			return nil, err
		}
		items = append(items, event)
	}
	return items, rows.Err()
}

func (r *Repository) CreateTransitEvent(ctx context.Context, event model.TransitEvent) (model.TransitEvent, error) {
	_, err := r.pool.Exec(ctx, `INSERT INTO transit_events (id, shipment_id, station_id, user_id, event_time, comment) VALUES ($1,$2,$3,$4,$5,$6)`, event.ID, event.ShipmentID, event.StationID, event.UserID, event.EventTime, event.Comment)
	return event, err
}

func (r *Repository) ListTransitEvents(ctx context.Context, shipmentID string) ([]model.TransitEvent, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, shipment_id, station_id, user_id, event_time, comment FROM transit_events WHERE shipment_id = $1 ORDER BY event_time ASC`, shipmentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []model.TransitEvent
	for rows.Next() {
		var event model.TransitEvent
		if err := rows.Scan(&event.ID, &event.ShipmentID, &event.StationID, &event.UserID, &event.EventTime, &event.Comment); err != nil {
			return nil, err
		}
		items = append(items, event)
	}
	return items, rows.Err()
}

func (r *Repository) CreateArrivalEvent(ctx context.Context, event model.ArrivalEvent) (model.ArrivalEvent, error) {
	_, err := r.pool.Exec(ctx, `INSERT INTO arrival_events (id, shipment_id, station_id, user_id, event_time, confirmed_as_final_arrival) VALUES ($1,$2,$3,$4,$5,$6)`, event.ID, event.ShipmentID, event.StationID, event.UserID, event.EventTime, event.ConfirmedAsFinalArrival)
	return event, err
}

func (r *Repository) ListArrivalEvents(ctx context.Context, shipmentID string) ([]model.ArrivalEvent, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, shipment_id, station_id, user_id, event_time, confirmed_as_final_arrival FROM arrival_events WHERE shipment_id = $1 ORDER BY event_time ASC`, shipmentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []model.ArrivalEvent
	for rows.Next() {
		var event model.ArrivalEvent
		if err := rows.Scan(&event.ID, &event.ShipmentID, &event.StationID, &event.UserID, &event.EventTime, &event.ConfirmedAsFinalArrival); err != nil {
			return nil, err
		}
		items = append(items, event)
	}
	return items, rows.Err()
}

func (r *Repository) ListNotifications(ctx context.Context, userID string) ([]model.Notification, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, user_id, message, read, type, related_id, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []model.Notification
	for rows.Next() {
		var item model.Notification
		if err := rows.Scan(&item.ID, &item.UserID, &item.Message, &item.Read, &item.Type, &item.RelatedID, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) CreateNotification(ctx context.Context, notification model.Notification) (model.Notification, error) {
	err := r.pool.QueryRow(ctx, `INSERT INTO notifications (user_id, message, read, type, related_id, created_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, notification.UserID, notification.Message, notification.Read, notification.Type, notification.RelatedID, notification.CreatedAt).Scan(&notification.ID)
	return notification, err
}

func (r *Repository) MarkNotificationRead(ctx context.Context, id int64) error {
	_, err := r.pool.Exec(ctx, `UPDATE notifications SET read = TRUE WHERE id = $1`, id)
	return err
}

func (r *Repository) AddAuditLog(ctx context.Context, log model.AuditLog) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO audit_log (id, user_id, entity_type, entity_id, action, old_value, new_value, station_id, reason, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, log.ID, log.UserID, log.EntityType, log.EntityID, log.Action, log.OldValue, log.NewValue, log.StationID, log.Reason, log.CreatedAt)
	return err
}

func (r *Repository) ListAuditLogs(ctx context.Context) ([]model.AuditLog, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, user_id, entity_type, entity_id, action, old_value, new_value, station_id, reason, created_at FROM audit_log ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []model.AuditLog
	for rows.Next() {
		var item model.AuditLog
		if err := rows.Scan(&item.ID, &item.UserID, &item.EntityType, &item.EntityID, &item.Action, &item.OldValue, &item.NewValue, &item.StationID, &item.Reason, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) GetDashboardReport(ctx context.Context) (model.DashboardReport, error) {
	var report model.DashboardReport
	start := startOfMonth()
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM shipments WHERE created_at >= $1`, start).Scan(&report.MonthlyShipments); err != nil {
		return report, err
	}
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM shipments WHERE created_at >= $1 AND shipment_status IN ('ISSUED','CLOSED')`, start).Scan(&report.CompletedShipments); err != nil {
		return report, err
	}
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM shipments WHERE shipment_status NOT IN ('ISSUED','CLOSED')`).Scan(&report.ActiveContracts); err != nil {
		return report, err
	}
	rows, err := r.pool.Query(ctx, `SELECT from_station, to_station, COALESCE(SUM(cost),0), COUNT(*) FROM shipments WHERE created_at >= $1 GROUP BY from_station, to_station ORDER BY 3 DESC LIMIT 5`, start)
	if err != nil {
		return report, err
	}
	defer rows.Close()
	var total float64
	for rows.Next() {
		var from, to string
		var revenue float64
		var count int
		if err := rows.Scan(&from, &to, &revenue, &count); err != nil {
			return report, err
		}
		report.RevenueByRoute = append(report.RevenueByRoute, model.RouteRevenue{Route: from + "-" + to, Revenue: revenue, Count: count})
		total += revenue
	}
	for i := range report.RevenueByRoute {
		if total > 0 {
			report.RevenueByRoute[i].Percentage = int(report.RevenueByRoute[i].Revenue / total * 100)
		}
	}
	return report, rows.Err()
}

func (r *Repository) GetFinanceReport(ctx context.Context) (model.FinanceReport, error) {
	var report model.FinanceReport
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM shipments WHERE payment_status = 'CONFIRMED'`).Scan(&report.PaidShipments); err != nil {
		return report, err
	}
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM shipments WHERE shipment_status IN ('ISSUED','CLOSED')`).Scan(&report.CompletedShipments); err != nil {
		return report, err
	}
	if err := r.pool.QueryRow(ctx, `SELECT COALESCE(SUM(amount),0) FROM payments WHERE status = 'CONFIRMED'`).Scan(&report.TotalRevenue); err != nil {
		return report, err
	}
	return report, nil
}

func (r *Repository) GetStatusSummary(ctx context.Context) ([]model.StatusSummaryItem, error) {
	rows, err := r.pool.Query(ctx, `SELECT shipment_status, COUNT(*) FROM shipments GROUP BY shipment_status ORDER BY shipment_status`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []model.StatusSummaryItem
	for rows.Next() {
		var item model.StatusSummaryItem
		if err := rows.Scan(&item.Status, &item.Count); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

const userSelect = `SELECT id, name, email, password_hash, role, company, deposit_balance, contract_number, phone, station, is_active, created_at FROM users`
const shipmentSelect = `SELECT id, shipment_number, client_id, client_name, client_email, from_station, to_station, current_station, next_station, route, status, shipment_status, payment_status, departure_date, weight, dimensions, description, value, cost, quantity_places, receiver_name, receiver_phone, train_time, tracking_code, qr_code_id, transport_unit_id, last_updated_at, created_by, created_at, updated_at FROM shipments`

func scanUser(row pgx.Row) (model.User, error) {
	var user model.User
	err := row.Scan(&user.ID, &user.Name, &user.Email, &user.PasswordHash, &user.Role, &user.Company, &user.DepositBalance, &user.ContractNumber, &user.Phone, &user.Station, &user.IsActive, &user.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return model.User{}, service.ErrNotFound
	}
	return user, err
}

func collectUsers(rows pgx.Rows) ([]model.User, error) {
	var items []model.User
	for rows.Next() {
		var user model.User
		if err := rows.Scan(&user.ID, &user.Name, &user.Email, &user.PasswordHash, &user.Role, &user.Company, &user.DepositBalance, &user.ContractNumber, &user.Phone, &user.Station, &user.IsActive, &user.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, user)
	}
	return items, rows.Err()
}

func scanShipment(row pgx.Row) (model.Shipment, error) {
	var shipment model.Shipment
	var routeRaw []byte
	err := row.Scan(&shipment.ID, &shipment.ShipmentNumber, &shipment.ClientID, &shipment.ClientName, &shipment.ClientEmail, &shipment.FromStation, &shipment.ToStation, &shipment.CurrentStation, &shipment.NextStation, &routeRaw, &shipment.Status, &shipment.ShipmentStatus, &shipment.PaymentStatus, &shipment.DepartureDate, &shipment.Weight, &shipment.Dimensions, &shipment.Description, &shipment.Value, &shipment.Cost, &shipment.QuantityPlaces, &shipment.ReceiverName, &shipment.ReceiverPhone, &shipment.TrainTime, &shipment.TrackingCode, &shipment.QRCodeID, &shipment.TransportUnitID, &shipment.LastUpdatedAt, &shipment.CreatedBy, &shipment.CreatedAt, &shipment.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return model.Shipment{}, service.ErrNotFound
	}
	if err != nil {
		return model.Shipment{}, err
	}
	_ = json.Unmarshal(routeRaw, &shipment.Route)
	return shipment, nil
}

func collectShipments(rows pgx.Rows) ([]model.Shipment, error) {
	var items []model.Shipment
	for rows.Next() {
		var shipment model.Shipment
		var routeRaw []byte
		if err := rows.Scan(&shipment.ID, &shipment.ShipmentNumber, &shipment.ClientID, &shipment.ClientName, &shipment.ClientEmail, &shipment.FromStation, &shipment.ToStation, &shipment.CurrentStation, &shipment.NextStation, &routeRaw, &shipment.Status, &shipment.ShipmentStatus, &shipment.PaymentStatus, &shipment.DepartureDate, &shipment.Weight, &shipment.Dimensions, &shipment.Description, &shipment.Value, &shipment.Cost, &shipment.QuantityPlaces, &shipment.ReceiverName, &shipment.ReceiverPhone, &shipment.TrainTime, &shipment.TrackingCode, &shipment.QRCodeID, &shipment.TransportUnitID, &shipment.LastUpdatedAt, &shipment.CreatedBy, &shipment.CreatedAt, &shipment.UpdatedAt); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(routeRaw, &shipment.Route)
		items = append(items, shipment)
	}
	return items, rows.Err()
}

func startOfMonth() time.Time {
	now := time.Now().UTC()
	return time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
}
