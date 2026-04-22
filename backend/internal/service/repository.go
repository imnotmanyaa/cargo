package service

import (
	"context"

	"cargo/backend/internal/model"
)

type Repository interface {
	CreateUser(ctx context.Context, user model.User) (model.User, error)
	UpdateUser(ctx context.Context, user model.User) (model.User, error)
	GetUserByEmail(ctx context.Context, email string) (model.User, error)
	GetUserByID(ctx context.Context, id string) (model.User, error)
	ListUsers(ctx context.Context) ([]model.User, error)
	ListEmployees(ctx context.Context) ([]model.User, error)
	CreateEmployee(ctx context.Context, user model.User) (model.User, error)
	DeleteEmployee(ctx context.Context, id string) error
	ListCorporateClients(ctx context.Context) ([]model.User, error)
	TopUpDeposit(ctx context.Context, userID string, amount float64) (float64, error)
	ListFrequentClients(ctx context.Context, provider string) ([]model.FrequentClient, error)
	CreateFrequentClient(ctx context.Context, client model.FrequentClient) (model.FrequentClient, error)

	ListRoles(ctx context.Context) ([]model.RoleRecord, error)
	ListStations(ctx context.Context) ([]model.Station, error)
	CreateStation(ctx context.Context, station model.Station) (model.Station, error)
	UpdateStation(ctx context.Context, station model.Station) (model.Station, error)
	UpsertStationByCode(ctx context.Context, station model.Station) (model.Station, error)

	CreateShipment(ctx context.Context, shipment model.Shipment) (model.Shipment, error)
	GetShipmentByID(ctx context.Context, id string) (model.Shipment, error)
	GetShipmentByTrackingCode(ctx context.Context, code string) (model.Shipment, error)
	ListShipments(ctx context.Context, filter model.ShipmentFilter) ([]model.Shipment, error)
	ListShipmentsByOriginStation(ctx context.Context, station string) ([]model.Shipment, error)
	UpdateShipment(ctx context.Context, shipment model.Shipment) (model.Shipment, error)
	AddShipmentHistory(ctx context.Context, history model.ShipmentHistory) error
	ListShipmentHistory(ctx context.Context, shipmentID string) ([]model.ShipmentHistory, error)

	CreatePayment(ctx context.Context, payment model.Payment) (model.Payment, error)
	GetPayment(ctx context.Context, id string) (model.Payment, error)
	ListPaymentsByShipment(ctx context.Context, shipmentID string) ([]model.Payment, error)
	ListPaymentsByUser(ctx context.Context, userID string) ([]model.Payment, error)
	UpdatePayment(ctx context.Context, payment model.Payment) (model.Payment, error)

	CreateQRCode(ctx context.Context, code model.QRCode) (model.QRCode, error)
	GetQRCodeByShipment(ctx context.Context, shipmentID string) (model.QRCode, error)

	CreateScanEvent(ctx context.Context, event model.ScanEvent) (model.ScanEvent, error)
	ListScanEvents(ctx context.Context, shipmentID string) ([]model.ScanEvent, error)
	CreateTransitEvent(ctx context.Context, event model.TransitEvent) (model.TransitEvent, error)
	ListTransitEvents(ctx context.Context, shipmentID string) ([]model.TransitEvent, error)
	CreateArrivalEvent(ctx context.Context, event model.ArrivalEvent) (model.ArrivalEvent, error)
	ListArrivalEvents(ctx context.Context, shipmentID string) ([]model.ArrivalEvent, error)

	ListNotifications(ctx context.Context, userID string) ([]model.Notification, error)
	CreateNotification(ctx context.Context, notification model.Notification) (model.Notification, error)
	MarkNotificationRead(ctx context.Context, id int64) error

	AddAuditLog(ctx context.Context, log model.AuditLog) error
	ListAuditLogs(ctx context.Context) ([]model.AuditLog, error)
	ListAuditLogsByUser(ctx context.Context, userID string) ([]model.AuditLog, error)

	GetDashboardReport(ctx context.Context) (model.DashboardReport, error)
	GetFinanceReport(ctx context.Context) (model.FinanceReport, error)
	GetStatusSummary(ctx context.Context) ([]model.StatusSummaryItem, error)

	// Wagon methods
	CreateWagon(ctx context.Context, wagon model.Wagon) (model.Wagon, error)
	GetWagonByID(ctx context.Context, id string) (model.Wagon, error)
	GetWagonByNumber(ctx context.Context, number string) (model.Wagon, error)
	UpdateWagon(ctx context.Context, wagon model.Wagon) (model.Wagon, error)
	ListWagons(ctx context.Context, station string, status *model.WagonStatus) ([]model.Wagon, error)
	
	// WagonShipment (Checklist) methods
	AssignShipmentToWagon(ctx context.Context, wagonID, shipmentID string) error
	RemoveShipmentFromWagon(ctx context.Context, wagonID, shipmentID string) error
	GetWagonShipments(ctx context.Context, wagonID string) ([]model.WagonShipment, error)
	UpdateWagonShipmentStatus(ctx context.Context, wagonID, shipmentID, status string) error
}
