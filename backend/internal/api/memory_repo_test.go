package api

import (
	"context"
	"sort"
	"sync"
	"time"

	"cargo/backend/internal/model"
	"cargo/backend/internal/service"
)

type memoryRepo struct {
	mu            sync.Mutex
	users         map[string]model.User
	roles         []model.RoleRecord
	stations      map[string]model.Station
	shipments     map[string]model.Shipment
	payments      map[string]model.Payment
	qrCodes       map[string]model.QRCode
	scanEvents    []model.ScanEvent
	transitEvents []model.TransitEvent
	arrivalEvents []model.ArrivalEvent
	history       []model.ShipmentHistory
	notifications []model.Notification
	auditLogs     []model.AuditLog
	nextNotifID   int64
}

func newMemoryRepo() *memoryRepo {
	return &memoryRepo{
		users:     map[string]model.User{},
		stations:  map[string]model.Station{},
		shipments: map[string]model.Shipment{},
		payments:  map[string]model.Payment{},
		qrCodes:   map[string]model.QRCode{},
		roles: []model.RoleRecord{
			{ID: "admin", Name: "admin", Description: "Administrator"},
			{ID: "operator", Name: "operator", Description: "Operator"},
			{ID: "receiver", Name: "receiver", Description: "Receiver"},
			{ID: "individual", Name: "individual", Description: "Client"},
			{ID: "corporate", Name: "corporate", Description: "Corporate"},
		},
	}
}

func (m *memoryRepo) CreateUser(_ context.Context, user model.User) (model.User, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, existing := range m.users {
		if existing.Email == user.Email {
			return model.User{}, service.ErrDuplicateEmail
		}
	}
	if user.CreatedAt.IsZero() {
		user.CreatedAt = time.Now().UTC()
	}
	m.users[user.ID] = user
	return user, nil
}

func (m *memoryRepo) UpdateUser(_ context.Context, user model.User) (model.User, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.users[user.ID] = user
	return user, nil
}

func (m *memoryRepo) GetUserByEmail(_ context.Context, email string) (model.User, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, user := range m.users {
		if user.Email == email {
			return user, nil
		}
	}
	return model.User{}, service.ErrNotFound
}

func (m *memoryRepo) GetUserByID(_ context.Context, id string) (model.User, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	user, ok := m.users[id]
	if !ok {
		return model.User{}, service.ErrNotFound
	}
	return user, nil
}

func (m *memoryRepo) ListUsers(_ context.Context) ([]model.User, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return mapUsers(m.users), nil
}

func (m *memoryRepo) ListEmployees(_ context.Context) ([]model.User, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var users []model.User
	for _, user := range m.users {
		if user.Role != model.RoleIndividual && user.Role != model.RoleCorporate {
			users = append(users, user)
		}
	}
	return users, nil
}

func (m *memoryRepo) CreateEmployee(ctx context.Context, user model.User) (model.User, error) {
	return m.CreateUser(ctx, user)
}

func (m *memoryRepo) DeleteEmployee(_ context.Context, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.users, id)
	return nil
}

func (m *memoryRepo) ListCorporateClients(_ context.Context) ([]model.User, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var users []model.User
	for _, user := range m.users {
		if user.Role == model.RoleCorporate {
			users = append(users, user)
		}
	}
	return users, nil
}

func (m *memoryRepo) TopUpDeposit(_ context.Context, userID string, amount float64) (float64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	user, ok := m.users[userID]
	if !ok {
		return 0, service.ErrNotFound
	}
	user.DepositBalance += amount
	m.users[userID] = user
	return user.DepositBalance, nil
}

func (m *memoryRepo) ListRoles(_ context.Context) ([]model.RoleRecord, error) { return m.roles, nil }

func (m *memoryRepo) ListStations(_ context.Context) ([]model.Station, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var stations []model.Station
	for _, station := range m.stations {
		stations = append(stations, station)
	}
	return stations, nil
}

func (m *memoryRepo) CreateStation(_ context.Context, station model.Station) (model.Station, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.stations[station.ID] = station
	return station, nil
}

func (m *memoryRepo) UpdateStation(_ context.Context, station model.Station) (model.Station, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.stations[station.ID] = station
	return station, nil
}

func (m *memoryRepo) CreateShipment(_ context.Context, shipment model.Shipment) (model.Shipment, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.shipments[shipment.ID] = shipment
	return shipment, nil
}

func (m *memoryRepo) GetShipmentByID(_ context.Context, id string) (model.Shipment, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	item, ok := m.shipments[id]
	if !ok {
		return model.Shipment{}, service.ErrNotFound
	}
	return item, nil
}

func (m *memoryRepo) GetShipmentByTrackingCode(_ context.Context, code string) (model.Shipment, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, item := range m.shipments {
		if (item.TrackingCode != nil && *item.TrackingCode == code) || item.ShipmentNumber == code {
			return item, nil
		}
	}
	return model.Shipment{}, service.ErrNotFound
}

func (m *memoryRepo) ListShipments(_ context.Context, filter model.ShipmentFilter) ([]model.Shipment, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var items []model.Shipment
	for _, shipment := range m.shipments {
		if filter.ClientID != "" && shipment.ClientID != filter.ClientID {
			continue
		}
		switch filter.Type {
		case "incoming":
			if shipment.NextStation == nil || *shipment.NextStation != filter.Station {
				continue
			}
		case "outgoing":
			if shipment.CurrentStation != filter.Station {
				continue
			}
		case "arrived":
			if shipment.CurrentStation != filter.Station || shipment.ShipmentStatus != model.ShipmentArrived {
				continue
			}
		}
		items = append(items, shipment)
	}
	return items, nil
}

func (m *memoryRepo) ListShipmentsByOriginStation(_ context.Context, station string) ([]model.Shipment, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var items []model.Shipment
	for _, shipment := range m.shipments {
		if shipment.FromStation == station {
			items = append(items, shipment)
		}
	}
	return items, nil
}

func (m *memoryRepo) UpdateShipment(_ context.Context, shipment model.Shipment) (model.Shipment, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.shipments[shipment.ID] = shipment
	return shipment, nil
}

func (m *memoryRepo) AddShipmentHistory(_ context.Context, history model.ShipmentHistory) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.history = append(m.history, history)
	return nil
}

func (m *memoryRepo) ListShipmentHistory(_ context.Context, shipmentID string) ([]model.ShipmentHistory, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var items []model.ShipmentHistory
	for _, item := range m.history {
		if item.ShipmentID == shipmentID {
			items = append(items, item)
		}
	}
	return items, nil
}

func (m *memoryRepo) CreatePayment(_ context.Context, payment model.Payment) (model.Payment, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.payments[payment.ID] = payment
	return payment, nil
}

func (m *memoryRepo) GetPayment(_ context.Context, id string) (model.Payment, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	item, ok := m.payments[id]
	if !ok {
		return model.Payment{}, service.ErrNotFound
	}
	return item, nil
}

func (m *memoryRepo) ListPaymentsByShipment(_ context.Context, shipmentID string) ([]model.Payment, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var items []model.Payment
	for _, payment := range m.payments {
		if payment.ShipmentID == shipmentID {
			items = append(items, payment)
		}
	}
	return items, nil
}

func (m *memoryRepo) UpdatePayment(_ context.Context, payment model.Payment) (model.Payment, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.payments[payment.ID] = payment
	return payment, nil
}

func (m *memoryRepo) CreateQRCode(_ context.Context, code model.QRCode) (model.QRCode, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.qrCodes[code.ShipmentID] = code
	return code, nil
}

func (m *memoryRepo) GetQRCodeByShipment(_ context.Context, shipmentID string) (model.QRCode, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	item, ok := m.qrCodes[shipmentID]
	if !ok {
		return model.QRCode{}, service.ErrNotFound
	}
	return item, nil
}

func (m *memoryRepo) CreateScanEvent(_ context.Context, event model.ScanEvent) (model.ScanEvent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.scanEvents = append(m.scanEvents, event)
	return event, nil
}

func (m *memoryRepo) ListScanEvents(_ context.Context, shipmentID string) ([]model.ScanEvent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var items []model.ScanEvent
	for _, item := range m.scanEvents {
		if item.ShipmentID == shipmentID {
			items = append(items, item)
		}
	}
	return items, nil
}

func (m *memoryRepo) CreateTransitEvent(_ context.Context, event model.TransitEvent) (model.TransitEvent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.transitEvents = append(m.transitEvents, event)
	return event, nil
}

func (m *memoryRepo) ListTransitEvents(_ context.Context, shipmentID string) ([]model.TransitEvent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var items []model.TransitEvent
	for _, item := range m.transitEvents {
		if item.ShipmentID == shipmentID {
			items = append(items, item)
		}
	}
	return items, nil
}

func (m *memoryRepo) CreateArrivalEvent(_ context.Context, event model.ArrivalEvent) (model.ArrivalEvent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.arrivalEvents = append(m.arrivalEvents, event)
	return event, nil
}

func (m *memoryRepo) ListArrivalEvents(_ context.Context, shipmentID string) ([]model.ArrivalEvent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var items []model.ArrivalEvent
	for _, item := range m.arrivalEvents {
		if item.ShipmentID == shipmentID {
			items = append(items, item)
		}
	}
	return items, nil
}

func (m *memoryRepo) ListNotifications(_ context.Context, userID string) ([]model.Notification, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var items []model.Notification
	for _, item := range m.notifications {
		if item.UserID == userID {
			items = append(items, item)
		}
	}
	return items, nil
}

func (m *memoryRepo) CreateNotification(_ context.Context, notification model.Notification) (model.Notification, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.nextNotifID++
	notification.ID = m.nextNotifID
	m.notifications = append(m.notifications, notification)
	return notification, nil
}

func (m *memoryRepo) MarkNotificationRead(_ context.Context, id int64) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.notifications {
		if m.notifications[i].ID == id {
			m.notifications[i].Read = true
		}
	}
	return nil
}

func (m *memoryRepo) AddAuditLog(_ context.Context, log model.AuditLog) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.auditLogs = append(m.auditLogs, log)
	return nil
}

func (m *memoryRepo) ListAuditLogs(_ context.Context) ([]model.AuditLog, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return append([]model.AuditLog{}, m.auditLogs...), nil
}

func (m *memoryRepo) GetDashboardReport(_ context.Context) (model.DashboardReport, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	report := model.DashboardReport{}
	for _, shipment := range m.shipments {
		report.MonthlyShipments++
		if shipment.ShipmentStatus == model.ShipmentIssued || shipment.ShipmentStatus == model.ShipmentClosed {
			report.CompletedShipments++
		} else {
			report.ActiveContracts++
		}
	}
	return report, nil
}

func (m *memoryRepo) GetFinanceReport(_ context.Context) (model.FinanceReport, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	report := model.FinanceReport{}
	for _, payment := range m.payments {
		if payment.Status == model.PaymentConfirmed {
			report.PaidShipments++
			report.TotalRevenue += payment.Amount
		}
	}
	for _, shipment := range m.shipments {
		if shipment.ShipmentStatus == model.ShipmentIssued || shipment.ShipmentStatus == model.ShipmentClosed {
			report.CompletedShipments++
		}
	}
	return report, nil
}

func (m *memoryRepo) GetStatusSummary(_ context.Context) ([]model.StatusSummaryItem, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	counts := map[string]int{}
	for _, shipment := range m.shipments {
		counts[string(shipment.ShipmentStatus)]++
	}
	var items []model.StatusSummaryItem
	for status, count := range counts {
		items = append(items, model.StatusSummaryItem{Status: status, Count: count})
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Status < items[j].Status })
	return items, nil
}

func mapUsers(users map[string]model.User) []model.User {
	var items []model.User
	for _, user := range users {
		items = append(items, user)
	}
	sort.Slice(items, func(i, j int) bool { return items[i].CreatedAt.After(items[j].CreatedAt) })
	return items
}
