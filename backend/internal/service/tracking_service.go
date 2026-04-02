package service

import (
	"context"
	"fmt"
	"time"

	"cargo/backend/internal/model"

	"github.com/google/uuid"
)

func (s *TrackingService) GenerateQRCode(ctx context.Context, shipmentID string) (model.QRCode, model.Shipment, error) {
	shipment, err := s.repo.GetShipmentByID(ctx, shipmentID)
	if err != nil {
		return model.QRCode{}, model.Shipment{}, err
	}
	if shipment.ShipmentStatus != model.ShipmentPaid && shipment.ShipmentStatus != model.ShipmentReadyForLoading {
		return model.QRCode{}, model.Shipment{}, fmt.Errorf("%w: generate QR requires PAID or READY_FOR_LOADING, current=%s", ErrInvalidTransition, shipment.ShipmentStatus)
	}
	code := model.QRCode{
		ID:          uuid.NewString(),
		ShipmentID:  shipmentID,
		QRValue:     shipment.ShipmentNumber,
		GeneratedAt: time.Now().UTC(),
		IsActive:    true,
	}
	code, err = s.repo.CreateQRCode(ctx, code)
	if err != nil {
		return model.QRCode{}, model.Shipment{}, err
	}
	shipment.QRCodeID = &code.ID
	shipment.TrackingCode = &code.QRValue
	if shipment.ShipmentStatus == model.ShipmentPaid {
		shipment.ShipmentStatus = model.ShipmentReadyForLoading
		shipment.Status = legacyStatusForLifecycle(shipment.ShipmentStatus)
	}
	shipment.LastUpdatedAt = time.Now().UTC()
	shipment.UpdatedAt = shipment.LastUpdatedAt
	shipment, err = s.repo.UpdateShipment(ctx, shipment)
	return code, shipment, err
}

func (s *TrackingService) GetTracking(ctx context.Context, code string) (model.Shipment, []model.ShipmentHistory, error) {
	shipment, err := s.repo.GetShipmentByTrackingCode(ctx, code)
	if err != nil {
		return model.Shipment{}, nil, err
	}
	history, err := s.repo.ListShipmentHistory(ctx, shipment.ID)
	return shipment, history, err
}

func (s *TrackingService) Scan(ctx context.Context, shipmentID, eventType string, stationID, transportUnitID, userID *string, comment *string) (model.ScanEvent, error) {
	shipment, err := s.repo.GetShipmentByID(ctx, shipmentID)
	if err != nil {
		return model.ScanEvent{}, err
	}
	event := model.ScanEvent{
		ID:              uuid.NewString(),
		ShipmentID:      shipmentID,
		QRCodeID:        shipment.QRCodeID,
		EventType:       eventType,
		StationID:       stationID,
		TransportUnitID: transportUnitID,
		UserID:          userID,
		OldStatus:       ptr(string(shipment.ShipmentStatus)),
		NewStatus:       ptr(string(shipment.ShipmentStatus)),
		Comment:         comment,
		ScannedAt:       time.Now().UTC(),
	}
	created, err := s.repo.CreateScanEvent(ctx, event)
	if err != nil {
		return model.ScanEvent{}, err
	}
	_ = s.repo.AddAuditLog(ctx, model.AuditLog{
		ID:         uuid.NewString(),
		UserID:     userID,
		EntityType: "scan_event",
		EntityID:   created.ID,
		Action:     eventType,
		OldValue:   created.OldStatus,
		NewValue:   created.NewStatus,
		StationID:  stationID,
		Reason:     comment,
		CreatedAt:  created.ScannedAt,
	})
	return created, nil
}

func (s *TrackingService) ListScanEvents(ctx context.Context, shipmentID string) ([]model.ScanEvent, error) {
	return s.repo.ListScanEvents(ctx, shipmentID)
}

func (s *TrackingService) TrackingHistory(ctx context.Context, shipmentID string) ([]model.ShipmentHistory, error) {
	return s.repo.ListShipmentHistory(ctx, shipmentID)
}
