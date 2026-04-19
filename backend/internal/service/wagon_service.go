package service

import (
	"context"
	"fmt"
	"time"

	"cargo/backend/internal/model"

	"github.com/google/uuid"
)

// WagonService manages wagons and their shipment checklists.
type WagonService struct{ repo Repository }

// CreateWagon creates a new wagon for a given station and date.
func (s *WagonService) CreateWagon(ctx context.Context, number, station, destination string, departureDate time.Time, capacity int) (model.Wagon, error) {
	if number == "" {
		return model.Wagon{}, fmt.Errorf("%w: wagon_number is required", ErrValidation)
	}
	if station == "" {
		return model.Wagon{}, fmt.Errorf("%w: current_station is required", ErrValidation)
	}
	if capacity <= 0 {
		capacity = 100
	}
	now := time.Now().UTC()
	wagon := model.Wagon{
		ID:             uuid.NewString(),
		WagonNumber:    number,
		Status:         model.WagonEmpty,
		CurrentStation: station,
		Destination:    destination,
		DepartureDate:  departureDate,
		Capacity:       capacity,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	return s.repo.CreateWagon(ctx, wagon)
}

// GetWagon returns a wagon by ID.
func (s *WagonService) GetWagon(ctx context.Context, id string) (model.Wagon, error) {
	return s.repo.GetWagonByID(ctx, id)
}

// ListWagons lists wagons for a station, optionally filtered by status.
func (s *WagonService) ListWagons(ctx context.Context, station string, status *model.WagonStatus) ([]model.Wagon, error) {
	return s.repo.ListWagons(ctx, station, status)
}

func (s *WagonService) AssignShipment(ctx context.Context, wagonID, shipmentID string) error {
	wagon, err := s.repo.GetWagonByID(ctx, wagonID)
	if err != nil {
		return err
	}
	shipment, err := s.repo.GetShipmentByID(ctx, shipmentID)
	if err != nil {
		return err
	}
	if shipment.CurrentStation != wagon.CurrentStation {
		return fmt.Errorf("%w: недопустимая станция, груз находится на другой станции (%s)", ErrValidation, shipment.CurrentStation)
	}
	if shipment.TransportUnitID != nil && *shipment.TransportUnitID != "" {
		return fmt.Errorf("%w: груз уже привязан к транспорту %s", ErrValidation, *shipment.TransportUnitID)
	}
	if shipment.ShipmentStatus == model.ShipmentClosed || shipment.ShipmentStatus == model.ShipmentIssued {
		return fmt.Errorf("%w: груз уже доставлен или выдан клиенту", ErrValidation)
	}

	if err := s.repo.AssignShipmentToWagon(ctx, wagonID, shipmentID); err != nil {
		return err
	}
	// Update shipment's transport_unit_id
	shipment.TransportUnitID = &wagon.WagonNumber
	shipment.UpdatedAt = time.Now().UTC()
	_, err = s.repo.UpdateShipment(ctx, shipment)
	return err
}

// RemoveShipment removes a shipment from a wagon checklist.
func (s *WagonService) RemoveShipment(ctx context.Context, wagonID, shipmentID string) error {
	return s.repo.RemoveShipmentFromWagon(ctx, wagonID, shipmentID)
}

// ScanShipmentInWagon marks a shipment in a wagon as LOADED/UNLOADED.
// Returns the wagon with updated checklist and whether all items are now complete.
func (s *WagonService) ScanShipmentInWagon(ctx context.Context, wagonID, shipmentID, newStatus string) (model.Wagon, []model.WagonShipment, bool, error) {
	if err := s.repo.UpdateWagonShipmentStatus(ctx, wagonID, shipmentID, newStatus); err != nil {
		return model.Wagon{}, nil, false, err
	}
	checklist, err := s.repo.GetWagonShipments(ctx, wagonID)
	if err != nil {
		return model.Wagon{}, nil, false, err
	}
	allDone := true
	for _, ws := range checklist {
		if ws.Status == "PENDING" {
			allDone = false
			break
		}
	}
	wagon, err := s.repo.GetWagonByID(ctx, wagonID)
	if err != nil {
		return model.Wagon{}, nil, false, err
	}
	if allDone {
		wagon.Status = model.WagonLoaded
		wagon.UpdatedAt = time.Now().UTC()
		wagon, _ = s.repo.UpdateWagon(ctx, wagon)
	}
	return wagon, checklist, allDone, nil
}

// MarkMissingInWagon marks a shipment as MISSING (exception: груз утерян).
func (s *WagonService) MarkMissingInWagon(ctx context.Context, wagonID, shipmentID string) error {
	return s.repo.UpdateWagonShipmentStatus(ctx, wagonID, shipmentID, "MISSING")
}

// GetChecklist returns the full checklist for a wagon with summary.
func (s *WagonService) GetChecklist(ctx context.Context, wagonID string) (model.Wagon, []model.WagonShipment, int, int, error) {
	wagon, err := s.repo.GetWagonByID(ctx, wagonID)
	if err != nil {
		return model.Wagon{}, nil, 0, 0, err
	}
	checklist, err := s.repo.GetWagonShipments(ctx, wagonID)
	if err != nil {
		return model.Wagon{}, nil, 0, 0, err
	}
	total := len(checklist)
	done := 0
	for _, ws := range checklist {
		if ws.Status != "PENDING" {
			done++
		}
	}
	return wagon, checklist, total, done, nil
}

// DispatchWagon сохраняет вагон с обновлённым статусом (IN_TRANSIT).
// Вызывается после проверки чеклиста в хэндлере (ТЗ п.5).
func (s *WagonService) DispatchWagon(ctx context.Context, wagon model.Wagon) (model.Wagon, error) {
	return s.repo.UpdateWagon(ctx, wagon)
}
