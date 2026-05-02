package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"sort"
	"strings"
	"time"

	"cargo/backend/internal/model"
	"cargo/backend/internal/service"
	"cargo/backend/migrations"

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

func (db *DB) Migrate() error {
	ctx := context.Background()

	entries, err := migrations.FS.ReadDir(".")
	if err != nil {
		return fmt.Errorf("failed to read migrations dir: %v", err)
	}

	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)

	for _, file := range files {
		content, err := migrations.FS.ReadFile(file)
		if err != nil {
			return fmt.Errorf("failed to read migration %s: %v", file, err)
		}
		
		log.Printf("Applying migration: %s", file)
		if _, err := db.pool.Exec(ctx, string(content)); err != nil {
			log.Printf("Note: Error applying migration %s (safe if already applied): %v", file, err)
		}
	}
	
	// Create or update default admin user
	_, _ = db.pool.Exec(ctx, `
		INSERT INTO users (id, name, email, password_hash, role, deposit_balance, is_active)
		VALUES ('admin-001', 'Admin', 'admin@admin.com', '$2a$10$6a38vVYPoVs0OBngM21Ksu9Rz0QaShAfhSg.DjRxjb8oInIKlh0me', 'admin', 0, true)
		ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash
	`)

	return nil
}


type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) CreateUser(ctx context.Context, user model.User) (model.User, error) {
	if user.ClientSegment == "" {
		user.ClientSegment = model.ClientSegmentForRole(user.Role)
	}
	_, err := r.pool.Exec(ctx, `
		INSERT INTO users (id, name, email, password_hash, role, client_segment, company, deposit_balance, contract_number, phone, station, is_active, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
	`, user.ID, user.Name, user.Email, user.PasswordHash, user.Role, user.ClientSegment, user.Company, user.DepositBalance, user.ContractNumber, user.Phone, user.Station, user.IsActive, user.CreatedAt)
	if err != nil {
		return model.User{}, err
	}
	return user, nil
}

func (r *Repository) UpdateUser(ctx context.Context, user model.User) (model.User, error) {
	if user.ClientSegment == "" {
		user.ClientSegment = model.ClientSegmentForRole(user.Role)
	}
	_, err := r.pool.Exec(ctx, `
		UPDATE users SET name = $2, email = $3, role = $4, client_segment = $5, company = $6, deposit_balance = $7, contract_number = $8, phone = $9, station = $10, is_active = $11
		WHERE id = $1
	`, user.ID, user.Name, user.Email, user.Role, user.ClientSegment, user.Company, user.DepositBalance, user.ContractNumber, user.Phone, user.Station, user.IsActive)
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
	rows, err := r.pool.Query(ctx, userSelect+` WHERE role IN ('admin','manager','direction_head','chief_head','receiver','train_receiver','loading_operator','transit_operator','issue_operator','accounting', 'mobile_group', 'courier') ORDER BY created_at DESC`)
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
	rows, err := r.pool.Query(ctx, userSelect+` WHERE role = 'corporate' AND is_active = TRUE ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectUsers(rows)
}

func (r *Repository) TopUpDeposit(ctx context.Context, userID string, amount float64) (float64, error) {
	var balance float64
	var err error

	if amount < 0 {
		// Prevent negative balances natively in the database
		err = r.pool.QueryRow(ctx, `UPDATE users SET deposit_balance = deposit_balance + $2 WHERE id = $1 AND deposit_balance + $2 >= 0 RETURNING deposit_balance`, userID, amount).Scan(&balance)
	} else {
		err = r.pool.QueryRow(ctx, `UPDATE users SET deposit_balance = deposit_balance + $2 WHERE id = $1 RETURNING deposit_balance`, userID, amount).Scan(&balance)
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, service.ErrNotFound
	}
	return balance, err
}

func (r *Repository) ListFrequentClients(ctx context.Context, provider string) ([]model.FrequentClient, error) {
	query := `
		SELECT id, provider, client_segment, company_name, client_name, phone, contract_number, notes, is_active, created_at
		FROM frequent_clients
		WHERE is_active = TRUE
	`
	args := []any{}
	if provider != "" {
		query += ` AND provider = $1`
		args = append(args, provider)
	}
	query += ` ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.FrequentClient
	for rows.Next() {
		var item model.FrequentClient
		if err := rows.Scan(
			&item.ID,
			&item.Provider,
			&item.ClientSegment,
			&item.CompanyName,
			&item.ClientName,
			&item.Phone,
			&item.ContractNumber,
			&item.Notes,
			&item.IsActive,
			&item.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) CreateFrequentClient(ctx context.Context, client model.FrequentClient) (model.FrequentClient, error) {
	if client.ClientSegment == "" {
		client.ClientSegment = model.ClientSegmentLegalEntity
	}
	_, err := r.pool.Exec(ctx, `
		INSERT INTO frequent_clients (id, provider, client_segment, company_name, client_name, phone, contract_number, notes, is_active, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
	`, client.ID, client.Provider, client.ClientSegment, client.CompanyName, client.ClientName, client.Phone, client.ContractNumber, client.Notes, client.IsActive, client.CreatedAt)
	if err != nil {
		return model.FrequentClient{}, err
	}
	return client, nil
}

func (r *Repository) UpdateFrequentClient(ctx context.Context, id, clientName string, companyName, phone, contractNumber, notes *string) (model.FrequentClient, error) {
	var item model.FrequentClient
	err := r.pool.QueryRow(ctx, `
		UPDATE frequent_clients
		SET client_name = $2, company_name = $3, phone = $4, contract_number = $5, notes = $6
		WHERE id = $1 AND is_active = TRUE
		RETURNING id, provider, company_name, client_name, phone, contract_number, notes, is_active, created_at
	`, id, clientName, companyName, phone, contractNumber, notes).Scan(
		&item.ID, &item.Provider, &item.CompanyName, &item.ClientName,
		&item.Phone, &item.ContractNumber, &item.Notes, &item.IsActive, &item.CreatedAt,
	)
	if err != nil {
		return model.FrequentClient{}, err
	}
	return item, nil
}

func (r *Repository) DeleteFrequentClient(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `UPDATE frequent_clients SET is_active = FALSE WHERE id = $1`, id)
	return err
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

func (r *Repository) UpsertStationByCode(ctx context.Context, station model.Station) (model.Station, error) {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO stations (id, name, city, code, is_active)
		VALUES ($1,$2,$3,$4,$5)
		ON CONFLICT (code) DO UPDATE SET
			name = EXCLUDED.name,
			city = EXCLUDED.city,
			is_active = EXCLUDED.is_active
	`, station.ID, station.Name, station.City, station.Code, station.IsActive)
	return station, err
}

func (r *Repository) CreateShipment(ctx context.Context, shipment model.Shipment) (model.Shipment, error) {
	routeJSON, _ := json.Marshal(shipment.Route)
	_, err := r.pool.Exec(ctx, `
		INSERT INTO shipments (
			id, shipment_number, client_id, client_name, client_email, from_station, to_station, current_station, next_station, route,
			status, shipment_status, payment_status, departure_date, weight, dimensions, description, value, cost, quantity_places,
			receiver_name, receiver_phone, sender_phone, tracking_code, qr_code_id, transport_unit_id,
			is_door_to_door, pickup_address, delivery_address, door_to_door_phone,
			payment_required, extra_charge, pickup_code, issue_code, last_updated_at, created_by, created_at, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
			$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
			$21,$22,$23,$24,$25,$26,
			$27,$28,$29,$30,
			$31,$32,$33,$34,$35,$36,$37,$38
		)
	`, shipment.ID, shipment.ShipmentNumber, shipment.ClientID, shipment.ClientName, shipment.ClientEmail, shipment.FromStation, shipment.ToStation, shipment.CurrentStation, shipment.NextStation, routeJSON, shipment.Status, shipment.ShipmentStatus, shipment.PaymentStatus, shipment.DepartureDate, shipment.Weight, shipment.Dimensions, shipment.Description, shipment.Value, shipment.Cost, shipment.QuantityPlaces, shipment.ReceiverName, shipment.ReceiverPhone, shipment.SenderPhone, shipment.TrackingCode, shipment.QRCodeID, shipment.TransportUnitID, shipment.IsDoorToDoor, shipment.PickupAddress, shipment.DeliveryAddress, shipment.DoorToDoorPhone, shipment.PaymentRequired, shipment.ExtraCharge, shipment.PickupCode, shipment.IssueCode, shipment.LastUpdatedAt, shipment.CreatedBy, shipment.CreatedAt, shipment.UpdatedAt)
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
	conditions := []string{}

	switch filter.Type {
	case "incoming":
		args = append(args, filter.Station)
		conditions = append(conditions, fmt.Sprintf("next_station = $%d", len(args)))
	case "outgoing":
		args = append(args, filter.Station)
		conditions = append(conditions, fmt.Sprintf("current_station = $%d AND shipment_status IN ('READY_FOR_LOADING','LOADED','IN_TRANSIT')", len(args)))
	case "arrived":
		args = append(args, filter.Station)
		conditions = append(conditions, fmt.Sprintf("current_station = $%d AND shipment_status IN ('ARRIVED', 'READY_FOR_ISSUE')", len(args)))
	}

	if filter.ClientID != "" {
		args = append(args, filter.ClientID)
		conditions = append(conditions, fmt.Sprintf("client_id = $%d", len(args)))
	}

	where := ""
	if len(conditions) > 0 {
		where = " WHERE " + strings.Join(conditions, " AND ")
	}

	rows, err := r.pool.Query(ctx, query+where+` ORDER BY created_at DESC`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectShipments(rows)
}

func (r *Repository) ListShipmentsByOriginStation(ctx context.Context, station string) ([]model.Shipment, error) {
	rows, err := r.pool.Query(ctx, shipmentSelect+` WHERE from_station = $1 OR to_station = $1 OR current_station = $1 OR next_station = $1 ORDER BY created_at DESC`, station)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectShipments(rows)
}

func (r *Repository) ListShipmentsByStatus(ctx context.Context, status model.ShipmentLifecycle, loadedBefore time.Time) ([]model.Shipment, error) {
	rows, err := r.pool.Query(ctx, shipmentSelect+` WHERE shipment_status = $1 AND updated_at < $2 ORDER BY created_at DESC`, status, loadedBefore)
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
			sender_phone = $23,
			tracking_code = $24,
			qr_code_id = $25,
			transport_unit_id = $26,
			courier_id = $27,
			is_door_to_door = $28,
			pickup_address = $29,
			delivery_address = $30,
			door_to_door_phone = $31,
			payment_required = $32,
			extra_charge = $33,
			pickup_code = $34,
			issue_code = $35,
			last_updated_at = $36,
			created_by = $37,
			updated_at = $38
		WHERE id = $1
	`, shipment.ID, shipment.ShipmentNumber, shipment.ClientID, shipment.ClientName, shipment.ClientEmail, shipment.FromStation, shipment.ToStation, shipment.CurrentStation, shipment.NextStation, routeJSON, shipment.Status, shipment.ShipmentStatus, shipment.PaymentStatus, shipment.DepartureDate, shipment.Weight, shipment.Dimensions, shipment.Description, shipment.Value, shipment.Cost, shipment.QuantityPlaces, shipment.ReceiverName, shipment.ReceiverPhone, shipment.SenderPhone, shipment.TrackingCode, shipment.QRCodeID, shipment.TransportUnitID, shipment.CourierID, shipment.IsDoorToDoor, shipment.PickupAddress, shipment.DeliveryAddress, shipment.DoorToDoorPhone, shipment.PaymentRequired, shipment.ExtraCharge, shipment.PickupCode, shipment.IssueCode, shipment.LastUpdatedAt, shipment.CreatedBy, shipment.UpdatedAt)
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
	items := []model.ShipmentHistory{}
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
	items := []model.Payment{}
	for rows.Next() {
		var payment model.Payment
		if err := rows.Scan(&payment.ID, &payment.ShipmentID, &payment.Amount, &payment.PaymentMethod, &payment.POSReference, &payment.PaidAt, &payment.ConfirmedBy, &payment.Status, &payment.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, payment)
	}
	return items, rows.Err()
}

func (r *Repository) ListPaymentsByUser(ctx context.Context, userID string) ([]model.Payment, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT p.id, p.shipment_id, p.amount, p.payment_method, p.pos_terminal_reference, p.paid_at, p.confirmed_by, p.status, p.created_at, s.shipment_number 
		FROM payments p
		JOIN shipments s ON p.shipment_id = s.id
		WHERE p.confirmed_by = $1 
		ORDER BY p.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []model.Payment{}
	for rows.Next() {
		var payment model.Payment
		if err := rows.Scan(&payment.ID, &payment.ShipmentID, &payment.Amount, &payment.PaymentMethod, &payment.POSReference, &payment.PaidAt, &payment.ConfirmedBy, &payment.Status, &payment.CreatedAt, &payment.ShipmentNumber); err != nil {
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
	items := []model.ScanEvent{}
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
	items := []model.TransitEvent{}
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
	items := []model.ArrivalEvent{}
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
	items := []model.Notification{}
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
	rows, err := r.pool.Query(ctx, `
		SELECT a.id, a.user_id, a.entity_type, a.entity_id, a.action, a.old_value, a.new_value, a.station_id, a.reason, a.created_at, s.shipment_number,
		COALESCE(u.name, 'Система') as user_name,
		COALESCE(u.role, 'system') as user_role
		FROM audit_log a
		LEFT JOIN shipments s ON a.entity_id = s.id AND a.entity_type = 'shipment'
		LEFT JOIN users u ON a.user_id = u.id
		ORDER BY a.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []model.AuditLog{}
	for rows.Next() {
		var item model.AuditLog
		if err := rows.Scan(&item.ID, &item.UserID, &item.EntityType, &item.EntityID, &item.Action, &item.OldValue, &item.NewValue, &item.StationID, &item.Reason, &item.CreatedAt, &item.ShipmentNumber, &item.UserName, &item.UserRole); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repository) ListAuditLogsByUser(ctx context.Context, userID string) ([]model.AuditLog, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT a.id, a.user_id, a.entity_type, a.entity_id, a.action, a.old_value, a.new_value, a.station_id, a.reason, a.created_at, s.shipment_number
		FROM audit_log a
		LEFT JOIN shipments s ON a.entity_id = s.id AND a.entity_type = 'shipment'
		WHERE a.user_id = $1 
		ORDER BY a.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []model.AuditLog{}
	for rows.Next() {
		var item model.AuditLog
		if err := rows.Scan(&item.ID, &item.UserID, &item.EntityType, &item.EntityID, &item.Action, &item.OldValue, &item.NewValue, &item.StationID, &item.Reason, &item.CreatedAt, &item.ShipmentNumber); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}


func (r *Repository) GetDashboardReport(ctx context.Context) (model.DashboardReport, error) {
	var report model.DashboardReport
	start := startOfMonth()
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) , pickup_code, issue_code FROM shipments WHERE created_at >= $1`, start).Scan(&report.MonthlyShipments); err != nil {
		return report, err
	}
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM shipments WHERE created_at >= $1 AND shipment_status IN ('ISSUED','CLOSED')`, start).Scan(&report.CompletedShipments); err != nil {
		return report, err
	}
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM shipments WHERE shipment_status NOT IN ('ISSUED','CLOSED')`).Scan(&report.ActiveContracts); err != nil {
		return report, err
	}
	rows, err := r.pool.Query(ctx, `SELECT from_station, to_station, COALESCE(SUM(cost),0), COUNT(*) FROM shipments WHERE created_at >= $1 GROUP BY from_station, to_station ORDER BY 3 DESC`, start)
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

	// Revenue by month (last 6 months, confirmed payments).
	revRows, err := r.pool.Query(ctx, `
		SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
		       COALESCE(SUM(amount), 0) AS revenue
		FROM payments
		WHERE status = 'CONFIRMED'
		  AND created_at >= date_trunc('month', now()) - interval '5 months'
		GROUP BY 1
		ORDER BY 1
	`)
	if err != nil {
		return report, err
	}
	defer revRows.Close()
	for revRows.Next() {
		var item model.RevenueByMonthItem
		if err := revRows.Scan(&item.Month, &item.Revenue); err != nil {
			return report, err
		}
		report.RevenueByMonth = append(report.RevenueByMonth, item)
	}
	if err := revRows.Err(); err != nil {
		return report, err
	}

	// Wagons by status.
	wRows, err := r.pool.Query(ctx, `SELECT status, COUNT(*) FROM wagons GROUP BY status ORDER BY status`)
	if err == nil {
		defer wRows.Close()
		for wRows.Next() {
			var item model.CountByStatusItem
			if err := wRows.Scan(&item.Status, &item.Count); err != nil {
				return report, err
			}
			report.WagonsByStatus = append(report.WagonsByStatus, item)
		}
		if err := wRows.Err(); err != nil {
			return report, err
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
	items := []model.StatusSummaryItem{}
	for rows.Next() {
		var item model.StatusSummaryItem
		if err := rows.Scan(&item.Status, &item.Count); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

const userSelect = `SELECT id, name, email, password_hash, role, client_segment, company, deposit_balance, contract_number, phone, station, is_active, created_at FROM users`
const shipmentSelect = `SELECT id, shipment_number, client_id, client_name, client_email, from_station, to_station, current_station, next_station, route, status, shipment_status, payment_status, departure_date, weight, dimensions, description, value, cost, quantity_places, receiver_name, receiver_phone, sender_phone, tracking_code, qr_code_id, transport_unit_id, COALESCE(courier_id, '') as courier_id, is_door_to_door, pickup_address, delivery_address, door_to_door_phone, payment_required, extra_charge, pickup_code, issue_code, last_updated_at, created_by, created_at, updated_at FROM shipments`

func scanUser(row pgx.Row) (model.User, error) {
	var user model.User
	err := row.Scan(&user.ID, &user.Name, &user.Email, &user.PasswordHash, &user.Role, &user.ClientSegment, &user.Company, &user.DepositBalance, &user.ContractNumber, &user.Phone, &user.Station, &user.IsActive, &user.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return model.User{}, service.ErrNotFound
	}
	return user, err
}

func collectUsers(rows pgx.Rows) ([]model.User, error) {
	items := []model.User{}
	for rows.Next() {
		var user model.User
		if err := rows.Scan(&user.ID, &user.Name, &user.Email, &user.PasswordHash, &user.Role, &user.ClientSegment, &user.Company, &user.DepositBalance, &user.ContractNumber, &user.Phone, &user.Station, &user.IsActive, &user.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, user)
	}
	return items, rows.Err()
}

func scanShipment(row pgx.Row) (model.Shipment, error) {
	var shipment model.Shipment
	var routeRaw []byte
	var courierID string
	err := row.Scan(&shipment.ID, &shipment.ShipmentNumber, &shipment.ClientID, &shipment.ClientName, &shipment.ClientEmail, &shipment.FromStation, &shipment.ToStation, &shipment.CurrentStation, &shipment.NextStation, &routeRaw, &shipment.Status, &shipment.ShipmentStatus, &shipment.PaymentStatus, &shipment.DepartureDate, &shipment.Weight, &shipment.Dimensions, &shipment.Description, &shipment.Value, &shipment.Cost, &shipment.QuantityPlaces, &shipment.ReceiverName, &shipment.ReceiverPhone, &shipment.SenderPhone, &shipment.TrackingCode, &shipment.QRCodeID, &shipment.TransportUnitID, &courierID, &shipment.IsDoorToDoor, &shipment.PickupAddress, &shipment.DeliveryAddress, &shipment.DoorToDoorPhone, &shipment.PaymentRequired, &shipment.ExtraCharge, &shipment.PickupCode, &shipment.IssueCode, &shipment.LastUpdatedAt, &shipment.CreatedBy, &shipment.CreatedAt, &shipment.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return model.Shipment{}, service.ErrNotFound
	}
	if err != nil {
		return model.Shipment{}, err
	}
	if courierID != "" {
		shipment.CourierID = &courierID
	}
	_ = json.Unmarshal(routeRaw, &shipment.Route)
	return shipment, nil
}

func collectShipments(rows pgx.Rows) ([]model.Shipment, error) {
	items := []model.Shipment{}
	for rows.Next() {
		var shipment model.Shipment
		var routeRaw []byte
		var courierID string
		if err := rows.Scan(&shipment.ID, &shipment.ShipmentNumber, &shipment.ClientID, &shipment.ClientName, &shipment.ClientEmail, &shipment.FromStation, &shipment.ToStation, &shipment.CurrentStation, &shipment.NextStation, &routeRaw, &shipment.Status, &shipment.ShipmentStatus, &shipment.PaymentStatus, &shipment.DepartureDate, &shipment.Weight, &shipment.Dimensions, &shipment.Description, &shipment.Value, &shipment.Cost, &shipment.QuantityPlaces, &shipment.ReceiverName, &shipment.ReceiverPhone, &shipment.SenderPhone, &shipment.TrackingCode, &shipment.QRCodeID, &shipment.TransportUnitID, &courierID, &shipment.IsDoorToDoor, &shipment.PickupAddress, &shipment.DeliveryAddress, &shipment.DoorToDoorPhone, &shipment.PaymentRequired, &shipment.ExtraCharge, &shipment.PickupCode, &shipment.IssueCode, &shipment.LastUpdatedAt, &shipment.CreatedBy, &shipment.CreatedAt, &shipment.UpdatedAt); err != nil {
			return nil, err
		}
		if courierID != "" {
			shipment.CourierID = &courierID
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

// ── Wagon methods ─────────────────────────────────────────────────────────────

func (r *Repository) CreateWagon(ctx context.Context, wagon model.Wagon) (model.Wagon, error) {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO wagons (id, wagon_number, status, current_station, destination, departure_date, capacity, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
	`, wagon.ID, wagon.WagonNumber, wagon.Status, wagon.CurrentStation, wagon.Destination, wagon.DepartureDate, wagon.Capacity, wagon.CreatedAt, wagon.UpdatedAt)
	if err != nil {
		return model.Wagon{}, err
	}
	return wagon, nil
}

func (r *Repository) GetWagonByID(ctx context.Context, id string) (model.Wagon, error) {
	var w model.Wagon
	err := r.pool.QueryRow(ctx, `
		SELECT id, wagon_number, status, current_station, destination, departure_date, capacity, created_at, updated_at
		FROM wagons WHERE id = $1
	`, id).Scan(&w.ID, &w.WagonNumber, &w.Status, &w.CurrentStation, &w.Destination, &w.DepartureDate, &w.Capacity, &w.CreatedAt, &w.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return model.Wagon{}, service.ErrNotFound
	}
	return w, err
}

func (r *Repository) GetWagonByNumber(ctx context.Context, number string) (model.Wagon, error) {
	var w model.Wagon
	err := r.pool.QueryRow(ctx, `
		SELECT id, wagon_number, status, current_station, destination, departure_date, capacity, created_at, updated_at
		FROM wagons WHERE wagon_number = $1
	`, number).Scan(&w.ID, &w.WagonNumber, &w.Status, &w.CurrentStation, &w.Destination, &w.DepartureDate, &w.Capacity, &w.CreatedAt, &w.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return model.Wagon{}, service.ErrNotFound
	}
	return w, err
}

func (r *Repository) UpdateWagon(ctx context.Context, wagon model.Wagon) (model.Wagon, error) {
	_, err := r.pool.Exec(ctx, `
		UPDATE wagons SET status = $2, current_station = $3, destination = $4, departure_date = $5, capacity = $6, updated_at = $7
		WHERE id = $1
	`, wagon.ID, wagon.Status, wagon.CurrentStation, wagon.Destination, wagon.DepartureDate, wagon.Capacity, wagon.UpdatedAt)
	return wagon, err
}

func (r *Repository) ListWagons(ctx context.Context, station string, status *model.WagonStatus) ([]model.Wagon, error) {
	query := `SELECT id, wagon_number, status, current_station, destination, departure_date, capacity, created_at, updated_at FROM wagons`
	args := []any{}
	where := []string{}

	if station != "" {
		args = append(args, station)
		where = append(where, fmt.Sprintf("current_station = $%d", len(args)))
	}
	if status != nil {
		args = append(args, *status)
		where = append(where, fmt.Sprintf("status = $%d", len(args)))
	}
	if len(where) > 0 {
		query += " WHERE " + strings.Join(where, " AND ")
	}
	query += " ORDER BY departure_date DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []model.Wagon{}
	for rows.Next() {
		var w model.Wagon
		if err := rows.Scan(&w.ID, &w.WagonNumber, &w.Status, &w.CurrentStation, &w.Destination, &w.DepartureDate, &w.Capacity, &w.CreatedAt, &w.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, w)
	}
	return items, rows.Err()
}

// ── WagonShipment (Checklist) methods ─────────────────────────────────────────

func (r *Repository) AssignShipmentToWagon(ctx context.Context, wagonID, shipmentID string) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO wagon_shipments (id, wagon_id, shipment_id, status)
		VALUES (gen_random_uuid()::text, $1, $2, 'PENDING')
		ON CONFLICT (wagon_id, shipment_id) DO NOTHING
	`, wagonID, shipmentID)
	return err
}

func (r *Repository) RemoveShipmentFromWagon(ctx context.Context, wagonID, shipmentID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM wagon_shipments WHERE wagon_id = $1 AND shipment_id = $2`, wagonID, shipmentID)
	return err
}

func (r *Repository) GetWagonShipments(ctx context.Context, wagonID string) ([]model.WagonShipment, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, wagon_id, shipment_id, status, scanned_at FROM wagon_shipments WHERE wagon_id = $1 ORDER BY shipment_id
	`, wagonID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []model.WagonShipment{}
	for rows.Next() {
		var ws model.WagonShipment
		if err := rows.Scan(&ws.ID, &ws.WagonID, &ws.ShipmentID, &ws.Status, &ws.ScannedAt); err != nil {
			return nil, err
		}
		items = append(items, ws)
	}
	return items, rows.Err()
}

func (r *Repository) UpdateWagonShipmentStatus(ctx context.Context, wagonID, shipmentID, status string) error {
	now := time.Now().UTC()
	_, err := r.pool.Exec(ctx, `
		UPDATE wagon_shipments SET status = $3, scanned_at = $4
		WHERE wagon_id = $1 AND shipment_id = $2
	`, wagonID, shipmentID, status, now)
	return err
}

func (r *Repository) ConfirmPaymentTx(ctx context.Context, paymentID, confirmedBy string) (model.Payment, model.Shipment, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return model.Payment{}, model.Shipment{}, err
	}
	defer tx.Rollback(ctx)

	var payment model.Payment
	err = tx.QueryRow(ctx, "SELECT id, shipment_id, amount, payment_method, pos_terminal_reference, paid_at, confirmed_by, status, created_at FROM payments WHERE id = $1 FOR UPDATE", paymentID).
		Scan(&payment.ID, &payment.ShipmentID, &payment.Amount, &payment.PaymentMethod, &payment.POSReference, &payment.PaidAt, &payment.ConfirmedBy, &payment.Status, &payment.CreatedAt)
	if err != nil {
		return model.Payment{}, model.Shipment{}, err
	}

	if payment.Status != model.PaymentPending {
		return model.Payment{}, model.Shipment{}, service.ErrInvalidTransition
	}

	var shipment model.Shipment
	err = tx.QueryRow(ctx, "SELECT id, client_id, from_station, to_station, departure_date, weight, dimensions, description, value, cost, quantity_places, receiver_name, receiver_phone, shipment_status, payment_status, status, created_at, updated_at, last_updated_at, shipment_number, is_door_to_door, pickup_address, delivery_address FROM shipments WHERE id = $1 FOR UPDATE", payment.ShipmentID).
		Scan(&shipment.ID, &shipment.ClientID, &shipment.FromStation, &shipment.ToStation, &shipment.DepartureDate, &shipment.Weight, &shipment.Dimensions, &shipment.Description, &shipment.Value, &shipment.Cost, &shipment.QuantityPlaces, &shipment.ReceiverName, &shipment.ReceiverPhone, &shipment.ShipmentStatus, &shipment.PaymentStatus, &shipment.Status, &shipment.CreatedAt, &shipment.UpdatedAt, &shipment.LastUpdatedAt, &shipment.ShipmentNumber, &shipment.IsDoorToDoor, &shipment.PickupAddress, &shipment.DeliveryAddress)
	if err != nil {
		return model.Payment{}, model.Shipment{}, err
	}

	if shipment.PaymentStatus == model.PaymentConfirmed || shipment.ShipmentStatus == model.ShipmentPaid {
		return model.Payment{}, model.Shipment{}, service.ErrInvalidTransition
	}

	if payment.PaymentMethod == "deposit" {
		var balance float64
		err = tx.QueryRow(ctx, "SELECT deposit_balance FROM users WHERE id = $1 FOR UPDATE", shipment.ClientID).Scan(&balance)
		if err != nil {
			return model.Payment{}, model.Shipment{}, err
		}
		if balance < payment.Amount {
			return model.Payment{}, model.Shipment{}, service.ErrInsufficientFunds
		}
		_, err = tx.Exec(ctx, "UPDATE users SET deposit_balance = deposit_balance - $2 WHERE id = $1", shipment.ClientID, payment.Amount)
		if err != nil {
			return model.Payment{}, model.Shipment{}, err
		}
	}

	now := time.Now().UTC()
	payment.Status = model.PaymentConfirmed
	payment.PaidAt = &now
	payment.ConfirmedBy = &confirmedBy

	_, err = tx.Exec(ctx, "UPDATE payments SET status = $2, paid_at = $3, confirmed_by = $4 WHERE id = $1", payment.ID, payment.Status, payment.PaidAt, payment.ConfirmedBy)
	if err != nil {
		return model.Payment{}, model.Shipment{}, err
	}

	oldStatus := shipment.ShipmentStatus
	shipment.PaymentStatus = model.PaymentConfirmed
	shipment.ShipmentStatus = model.ShipmentPaid
	shipment.Status = "Оплачен" // legacy status mapped to PAID
	shipment.LastUpdatedAt = now
	shipment.UpdatedAt = now

	_, err = tx.Exec(ctx, "UPDATE shipments SET payment_status = $2, shipment_status = $3, status = $4, last_updated_at = $5, updated_at = $6 WHERE id = $1", shipment.ID, shipment.PaymentStatus, shipment.ShipmentStatus, shipment.Status, shipment.LastUpdatedAt, shipment.UpdatedAt)
	if err != nil {
		return model.Payment{}, model.Shipment{}, err
	}

	_, err = tx.Exec(ctx, "INSERT INTO shipment_history (shipment_id, action, operator_id, details, old_status, new_status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)", shipment.ID, "Payment Confirmed", confirmedBy, "Payment confirmed", oldStatus, shipment.ShipmentStatus, now)
	if err != nil {
		return model.Payment{}, model.Shipment{}, err
	}

	err = tx.Commit(ctx)
	if err != nil {
		return model.Payment{}, model.Shipment{}, err
	}

	return payment, shipment, nil
}

