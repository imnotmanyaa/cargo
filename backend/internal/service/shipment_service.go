package service

import (
	"context"
	"fmt"
	"time"

	"cargo/backend/internal/model"

	"github.com/google/uuid"
)

type CreateShipmentRequest struct {
	ClientID       string
	ClientName     string
	ClientEmail    string
	FromStation    string
	ToStation      string
	DepartureDate  time.Time
	Weight         string
	Dimensions     string
	Description    string
	Value          string
	Cost           float64
	QuantityPlaces int
	ReceiverName   *string
	ReceiverPhone  *string
	TrainTime      *string
	CreatedBy      *string
}

type CorrectionRequest struct {
	ClientName     *string
	ClientEmail    *string
	FromStation    *string
	ToStation      *string
	Weight         *string
	Dimensions     *string
	Description    *string
	Value          *string
	Cost           *float64
	QuantityPlaces *int
	ReceiverName   *string
	ReceiverPhone  *string
	Reason         string
}

type IssueRequest struct {
	ReceiverName  string
	ReceiverPhone string
}

func (s *ShipmentService) Create(ctx context.Context, req CreateShipmentRequest) (model.Shipment, error) {
	if err := validateCreateShipment(req); err != nil {
		return model.Shipment{}, err
	}
	now := time.Now().UTC()
	route := calculateRoute(req.FromStation, req.ToStation)
	var nextStation *string
	if len(route) > 1 {
		nextStation = &route[1]
	}
	number := "SH-" + fmt.Sprintf("%06d", now.UnixNano()%1000000)
	shipment := model.Shipment{
		ID:              uuid.NewString(),
		ShipmentNumber:  number,
		ClientID:        req.ClientID,
		ClientName:      req.ClientName,
		ClientEmail:     req.ClientEmail,
		FromStation:     req.FromStation,
		ToStation:       req.ToStation,
		CurrentStation:  req.FromStation,
		NextStation:     nextStation,
		Route:           route,
		Status:          legacyStatusForLifecycle(model.ShipmentCreated),
		ShipmentStatus:  model.ShipmentCreated,
		PaymentStatus:   model.PaymentUnpaid,
		DepartureDate:   req.DepartureDate,
		Weight:          req.Weight,
		Dimensions:      req.Dimensions,
		Description:     req.Description,
		Value:           req.Value,
		Cost:            req.Cost,
		QuantityPlaces:  req.QuantityPlaces,
		ReceiverName:    req.ReceiverName,
		ReceiverPhone:   req.ReceiverPhone,
		TrainTime:       req.TrainTime,
		TrackingCode:    ptr(number),
		LastUpdatedAt:   now,
		CreatedBy:       req.CreatedBy,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	created, err := s.repo.CreateShipment(ctx, shipment)
	if err != nil {
		return model.Shipment{}, err
	}
	_ = s.repo.AddShipmentHistory(ctx, model.ShipmentHistory{
		ShipmentID: created.ID,
		Action:     "Created",
		OperatorID: req.CreatedBy,
		Details:    "Shipment created",
		NewStatus:  ptr(string(created.ShipmentStatus)),
		CreatedAt:  now,
	})
	_ = s.repo.AddAuditLog(ctx, model.AuditLog{
		ID:         uuid.NewString(),
		UserID:     req.CreatedBy,
		EntityType: "shipment",
		EntityID:   created.ID,
		Action:     "CREATE_SHIPMENT",
		NewValue:   ptr(string(created.ShipmentStatus)),
		CreatedAt:  now,
	})
	return created, nil
}

func (s *ShipmentService) Get(ctx context.Context, id string) (model.Shipment, error) {
	return s.repo.GetShipmentByID(ctx, id)
}

func (s *ShipmentService) List(ctx context.Context, filter model.ShipmentFilter) ([]model.Shipment, error) {
	if filter.Type == "by-station" {
		return s.repo.ListShipmentsByOriginStation(ctx, filter.Station)
	}
	return s.repo.ListShipments(ctx, filter)
}

func (s *ShipmentService) Edit(ctx context.Context, shipment model.Shipment) (model.Shipment, error) {
	current, err := s.repo.GetShipmentByID(ctx, shipment.ID)
	if err != nil {
		return model.Shipment{}, err
	}
	if current.ShipmentStatus != model.ShipmentCreated && current.ShipmentStatus != model.ShipmentDraft {
		return model.Shipment{}, ErrForbidden
	}
	if err := validateEditableShipment(shipment); err != nil {
		return model.Shipment{}, err
	}
	shipment.ShipmentStatus = current.ShipmentStatus
	shipment.PaymentStatus = current.PaymentStatus
	shipment.Status = legacyStatusForLifecycle(shipment.ShipmentStatus)
	shipment.UpdatedAt = time.Now().UTC()
	shipment.LastUpdatedAt = shipment.UpdatedAt
	return s.repo.UpdateShipment(ctx, shipment)
}

func (s *ShipmentService) CalculateTariff(ctx context.Context, id string) (model.Shipment, error) {
	shipment, err := s.repo.GetShipmentByID(ctx, id)
	if err != nil {
		return model.Shipment{}, err
	}
	weightSurcharge := 0.0
	if shipment.Weight != "" {
		var weight float64
		fmt.Sscanf(shipment.Weight, "%f", &weight)
		if weight > 20 {
			weightSurcharge = (weight - 20) * 150
		}
	}
	shipment.Cost = 5000 + weightSurcharge
	shipment.UpdatedAt = time.Now().UTC()
	shipment.LastUpdatedAt = shipment.UpdatedAt
	return s.repo.UpdateShipment(ctx, shipment)
}

func (s *ShipmentService) SendToPayment(ctx context.Context, id string) (model.Shipment, error) {
	return s.transition(ctx, id, model.ShipmentPaymentPending, nil, nil, nil, "Sent to payment", nil)
}

func (s *ShipmentService) ReadyForLoading(ctx context.Context, id string, operatorID, operatorName *string) (model.Shipment, error) {
	return s.transition(ctx, id, model.ShipmentReadyForLoading, operatorID, operatorName, nil, "Ready for loading", nil)
}

func (s *ShipmentService) Load(ctx context.Context, id string, operatorID, operatorName, station, transportUnitID *string) (model.Shipment, error) {
	shipment, err := s.transition(ctx, id, model.ShipmentLoaded, operatorID, operatorName, station, "Shipment loaded", transportUnitID)
	if err != nil {
		return model.Shipment{}, err
	}
	if station != nil {
		_, _ = s.repo.CreateScanEvent(ctx, model.ScanEvent{
			ID:              uuid.NewString(),
			ShipmentID:      id,
			QRCodeID:        shipment.QRCodeID,
			EventType:       "LOAD",
			StationID:       station,
			TransportUnitID: transportUnitID,
			UserID:          operatorID,
			OldStatus:       ptr(string(model.ShipmentReadyForLoading)),
			NewStatus:       ptr(string(model.ShipmentLoaded)),
			ScannedAt:       time.Now().UTC(),
		})
	}
	return shipment, nil
}

func (s *ShipmentService) Dispatch(ctx context.Context, id string, operatorID, operatorName, station *string) (model.Shipment, error) {
	return s.transition(ctx, id, model.ShipmentInTransit, operatorID, operatorName, station, "Shipment dispatched", nil)
}

func (s *ShipmentService) MarkTransit(ctx context.Context, id string, station string, operatorID, operatorName *string) (model.Shipment, error) {
	shipment, err := s.repo.GetShipmentByID(ctx, id)
	if err != nil {
		return model.Shipment{}, err
	}
	if shipment.ShipmentStatus != model.ShipmentInTransit && shipment.ShipmentStatus != model.ShipmentLoaded {
		return model.Shipment{}, ErrInvalidTransition
	}
	if station == shipment.ToStation {
		return model.Shipment{}, ErrForbidden
	}
	if indexOf(shipment.Route, station) == -1 {
		return model.Shipment{}, ErrForbidden
	}
	shipment.CurrentStation = station
	nextIndex := indexOf(shipment.Route, station) + 1
	if nextIndex < len(shipment.Route) {
		shipment.NextStation = &shipment.Route[nextIndex]
	}
	shipment.UpdatedAt = time.Now().UTC()
	shipment.LastUpdatedAt = shipment.UpdatedAt
	shipment, err = s.repo.UpdateShipment(ctx, shipment)
	if err != nil {
		return model.Shipment{}, err
	}
	_, _ = s.repo.CreateTransitEvent(ctx, model.TransitEvent{
		ID:         uuid.NewString(),
		ShipmentID: id,
		StationID:  station,
		UserID:     operatorID,
		EventTime:  time.Now().UTC(),
	})
	_ = s.repo.AddAuditLog(ctx, model.AuditLog{
		ID:         uuid.NewString(),
		UserID:     operatorID,
		EntityType: "shipment",
		EntityID:   id,
		Action:     "TRANSIT_EVENT",
		NewValue:   ptr(station),
		StationID:  ptr(station),
		CreatedAt:  time.Now().UTC(),
	})
	return shipment, nil
}

func (s *ShipmentService) Arrive(ctx context.Context, id string, station string, operatorID, operatorName *string) (model.Shipment, *model.Notification, error) {
	shipment, err := s.repo.GetShipmentByID(ctx, id)
	if err != nil {
		return model.Shipment{}, nil, err
	}
	if station != shipment.ToStation {
		return model.Shipment{}, nil, ErrForbidden
	}
	shipment, err = s.transition(ctx, id, model.ShipmentArrived, operatorID, operatorName, &station, "Shipment arrived", nil)
	if err != nil {
		return model.Shipment{}, nil, err
	}
	_, _ = s.repo.CreateArrivalEvent(ctx, model.ArrivalEvent{
		ID:                      uuid.NewString(),
		ShipmentID:              id,
		StationID:               station,
		UserID:                  operatorID,
		EventTime:               time.Now().UTC(),
		ConfirmedAsFinalArrival: true,
	})
	message := fmt.Sprintf("Ваш груз %s прибыл в пункт назначения %s", shipment.ShipmentNumber, station)
	notification, err := s.repo.CreateNotification(ctx, model.Notification{
		UserID:    shipment.ClientID,
		Message:   message,
		Type:      "shipment_arrival",
		RelatedID: ptr(shipment.ID),
		CreatedAt: time.Now().UTC(),
	})
	if err != nil {
		return shipment, nil, nil
	}
	return shipment, &notification, nil
}

func (s *ShipmentService) ReadyForIssue(ctx context.Context, id string, operatorID, operatorName *string) (model.Shipment, error) {
	return s.transition(ctx, id, model.ShipmentReadyForIssue, operatorID, operatorName, nil, "Ready for issue", nil)
}

func (s *ShipmentService) Issue(ctx context.Context, id string, operatorID, operatorName *string) (model.Shipment, error) {
	return s.IssueWithVerification(ctx, id, operatorID, operatorName, IssueRequest{})
}

func (s *ShipmentService) IssueWithVerification(ctx context.Context, id string, operatorID, operatorName *string, req IssueRequest) (model.Shipment, error) {
	shipment, err := s.repo.GetShipmentByID(ctx, id)
	if err != nil {
		return model.Shipment{}, err
	}
	if shipment.ShipmentStatus != model.ShipmentReadyForIssue {
		return model.Shipment{}, ErrInvalidTransition
	}
	if shipment.ReceiverName == nil || shipment.ReceiverPhone == nil {
		return model.Shipment{}, fmt.Errorf("%w: shipment receiver data is incomplete", ErrInvalidState)
	}
	if req.ReceiverName == "" || req.ReceiverPhone == "" {
		return model.Shipment{}, fmt.Errorf("%w: receiver verification data is required", ErrValidation)
	}
	if req.ReceiverName != *shipment.ReceiverName || req.ReceiverPhone != *shipment.ReceiverPhone {
		return model.Shipment{}, fmt.Errorf("%w: receiver verification failed", ErrForbidden)
	}
	events, err := s.repo.ListScanEvents(ctx, id)
	if err != nil {
		return model.Shipment{}, err
	}
	var issueScanFound bool
	for _, event := range events {
		if event.EventType == "ISSUE_SCAN" {
			issueScanFound = true
			break
		}
	}
	if !issueScanFound {
		return model.Shipment{}, fmt.Errorf("%w: ISSUE_SCAN is required before issue", ErrInvalidState)
	}
	return s.transition(ctx, id, model.ShipmentIssued, operatorID, operatorName, nil, "Issued to receiver", nil)
}

func (s *ShipmentService) Close(ctx context.Context, id string, operatorID, operatorName *string) (model.Shipment, error) {
	return s.transition(ctx, id, model.ShipmentClosed, operatorID, operatorName, nil, "Shipment closed", nil)
}

func (s *ShipmentService) Cancel(ctx context.Context, id string, operatorID, operatorName *string, reason *string) (model.Shipment, error) {
	return s.transition(ctx, id, model.ShipmentCancelled, operatorID, operatorName, nil, "Shipment cancelled", nil, reason)
}

func (s *ShipmentService) Hold(ctx context.Context, id string, operatorID, operatorName *string, reason *string) (model.Shipment, error) {
	return s.transition(ctx, id, model.ShipmentOnHold, operatorID, operatorName, nil, "Shipment on hold", nil, reason)
}

func (s *ShipmentService) Damage(ctx context.Context, id string, operatorID, operatorName *string, reason *string) (model.Shipment, error) {
	return s.transition(ctx, id, model.ShipmentDamaged, operatorID, operatorName, nil, "Shipment damaged", nil, reason)
}

func (s *ShipmentService) CorrectAfterPayment(ctx context.Context, id string, operatorID, operatorName *string, req CorrectionRequest) (model.Shipment, error) {
	if req.Reason == "" {
		return model.Shipment{}, fmt.Errorf("%w: correction reason is required", ErrValidation)
	}
	shipment, err := s.repo.GetShipmentByID(ctx, id)
	if err != nil {
		return model.Shipment{}, err
	}
	if shipment.PaymentStatus != model.PaymentConfirmed && shipment.ShipmentStatus != model.ShipmentPaid && shipment.ShipmentStatus != model.ShipmentReadyForLoading {
		return model.Shipment{}, fmt.Errorf("%w: post-payment correction is allowed only after payment", ErrInvalidState)
	}
	oldStatus := shipment.ShipmentStatus
	oldSnapshot := fmt.Sprintf("client=%s route=%s->%s qty=%d weight=%s dimensions=%s value=%s cost=%.2f receiver=%v/%v",
		shipment.ClientName, shipment.FromStation, shipment.ToStation, shipment.QuantityPlaces, shipment.Weight, shipment.Dimensions, shipment.Value, shipment.Cost, shipment.ReceiverName, shipment.ReceiverPhone)
	if req.ClientName != nil {
		shipment.ClientName = *req.ClientName
	}
	if req.ClientEmail != nil {
		shipment.ClientEmail = *req.ClientEmail
	}
	if req.FromStation != nil {
		shipment.FromStation = *req.FromStation
	}
	if req.ToStation != nil {
		shipment.ToStation = *req.ToStation
	}
	if req.Weight != nil {
		shipment.Weight = *req.Weight
	}
	if req.Dimensions != nil {
		shipment.Dimensions = *req.Dimensions
	}
	if req.Description != nil {
		shipment.Description = *req.Description
	}
	if req.Value != nil {
		shipment.Value = *req.Value
	}
	if req.Cost != nil {
		shipment.Cost = *req.Cost
	}
	if req.QuantityPlaces != nil {
		shipment.QuantityPlaces = *req.QuantityPlaces
	}
	if req.ReceiverName != nil {
		shipment.ReceiverName = req.ReceiverName
	}
	if req.ReceiverPhone != nil {
		shipment.ReceiverPhone = req.ReceiverPhone
	}
	if err := validateEditableShipment(shipment); err != nil {
		return model.Shipment{}, err
	}
	shipment.Route = calculateRoute(shipment.FromStation, shipment.ToStation)
	if len(shipment.Route) > 0 && (shipment.CurrentStation == "" || indexOf(shipment.Route, shipment.CurrentStation) == -1) {
		shipment.CurrentStation = shipment.FromStation
	}
	if nextIndex := indexOf(shipment.Route, shipment.CurrentStation) + 1; nextIndex > 0 && nextIndex < len(shipment.Route) {
		shipment.NextStation = &shipment.Route[nextIndex]
	} else if shipment.CurrentStation == shipment.ToStation {
		shipment.NextStation = nil
	}
	shipment.UpdatedAt = time.Now().UTC()
	shipment.LastUpdatedAt = shipment.UpdatedAt
	shipment, err = s.repo.UpdateShipment(ctx, shipment)
	if err != nil {
		return model.Shipment{}, err
	}
	newSnapshot := fmt.Sprintf("client=%s route=%s->%s qty=%d weight=%s dimensions=%s value=%s cost=%.2f receiver=%v/%v",
		shipment.ClientName, shipment.FromStation, shipment.ToStation, shipment.QuantityPlaces, shipment.Weight, shipment.Dimensions, shipment.Value, shipment.Cost, shipment.ReceiverName, shipment.ReceiverPhone)
	_ = s.repo.AddShipmentHistory(ctx, model.ShipmentHistory{
		ShipmentID:   id,
		Action:       "Post-payment correction",
		OperatorID:   operatorID,
		OperatorName: operatorName,
		Details:      "Shipment corrected after payment",
		OldStatus:    ptr(string(oldStatus)),
		NewStatus:    ptr(string(shipment.ShipmentStatus)),
		Reason:       &req.Reason,
		CreatedAt:    shipment.UpdatedAt,
	})
	_ = s.repo.AddAuditLog(ctx, model.AuditLog{
		ID:         uuid.NewString(),
		UserID:     operatorID,
		EntityType: "shipment",
		EntityID:   id,
		Action:     "POST_PAYMENT_CORRECTION",
		OldValue:   &oldSnapshot,
		NewValue:   &newSnapshot,
		Reason:     &req.Reason,
		CreatedAt:  shipment.UpdatedAt,
	})
	return shipment, nil
}

func (s *ShipmentService) ActionContext(ctx context.Context, id string, user *AuthenticatedUser) (model.ActionContext, error) {
	shipment, err := s.repo.GetShipmentByID(ctx, id)
	if err != nil {
		return model.ActionContext{}, err
	}
	result := model.ActionContext{
		Shipment:     shipment,
		UserRole:     "guest",
		RequiresAuth: false,
	}
	if user == nil {
		result.AllowedActions = []string{"view"}
		return result, nil
	}
	if user.ID == shipment.ClientID {
		result.UserRole = "sender"
		result.AllowedActions = []string{"view"}
		return result, nil
	}
	if user.Station == shipment.FromStation {
		result.UserRole = "origin-receiver"
		result.AllowedActions = []string{"view", "mark-loaded"}
		return result, nil
	}
	if user.Station == shipment.ToStation {
		result.UserRole = "destination-receiver"
		result.AllowedActions = []string{"view", "mark-arrived", "issue"}
		return result, nil
	}
	result.UserRole = "none"
	result.AllowedActions = []string{"view"}
	return result, nil
}

func (s *ShipmentService) transition(ctx context.Context, id string, next model.ShipmentLifecycle, operatorID, operatorName, station *string, action string, transportUnitID *string, reason ...*string) (model.Shipment, error) {
	shipment, err := s.repo.GetShipmentByID(ctx, id)
	if err != nil {
		return model.Shipment{}, err
	}
	if !isAllowedTransition(shipment.ShipmentStatus, next) {
		return model.Shipment{}, ErrInvalidTransition
	}
	old := shipment.ShipmentStatus
	shipment.ShipmentStatus = next
	shipment.Status = legacyStatusForLifecycle(next)
	if station != nil {
		shipment.CurrentStation = *station
	}
	if transportUnitID != nil {
		shipment.TransportUnitID = transportUnitID
	}
	shipment.UpdatedAt = time.Now().UTC()
	shipment.LastUpdatedAt = shipment.UpdatedAt
	if next == model.ShipmentArrived {
		shipment.NextStation = nil
	}
	updated, err := s.repo.UpdateShipment(ctx, shipment)
	if err != nil {
		return model.Shipment{}, err
	}
	var reasonText *string
	if len(reason) > 0 {
		reasonText = reason[0]
	}
	_ = s.repo.AddShipmentHistory(ctx, model.ShipmentHistory{
		ShipmentID:   id,
		Action:       action,
		OperatorID:   operatorID,
		OperatorName: operatorName,
		Station:      station,
		Details:      action,
		OldStatus:    ptr(string(old)),
		NewStatus:    ptr(string(next)),
		Reason:       reasonText,
		CreatedAt:    time.Now().UTC(),
	})
	_ = s.repo.AddAuditLog(ctx, model.AuditLog{
		ID:         uuid.NewString(),
		UserID:     operatorID,
		EntityType: "shipment",
		EntityID:   id,
		Action:     action,
		OldValue:   ptr(string(old)),
		NewValue:   ptr(string(next)),
		StationID:  station,
		Reason:     reasonText,
		CreatedAt:  time.Now().UTC(),
	})
	return updated, nil
}

func isAllowedTransition(current, next model.ShipmentLifecycle) bool {
	allowed := map[model.ShipmentLifecycle][]model.ShipmentLifecycle{
		model.ShipmentDraft:           {model.ShipmentCreated},
		model.ShipmentCreated:         {model.ShipmentPaymentPending, model.ShipmentCancelled},
		model.ShipmentPaymentPending:  {model.ShipmentPaid, model.ShipmentCancelled},
		model.ShipmentPaid:            {model.ShipmentReadyForLoading, model.ShipmentOnHold},
		model.ShipmentReadyForLoading: {model.ShipmentLoaded, model.ShipmentOnHold},
		model.ShipmentLoaded:          {model.ShipmentInTransit, model.ShipmentDamaged},
		model.ShipmentInTransit:       {model.ShipmentArrived, model.ShipmentOnHold, model.ShipmentDamaged},
		model.ShipmentArrived:         {model.ShipmentReadyForIssue, model.ShipmentDamaged},
		model.ShipmentReadyForIssue:   {model.ShipmentIssued},
		model.ShipmentIssued:          {model.ShipmentClosed},
		model.ShipmentOnHold:          {model.ShipmentReadyForLoading, model.ShipmentInTransit, model.ShipmentArrived},
	}
	for _, item := range allowed[current] {
		if item == next {
			return true
		}
	}
	return false
}

func validateCreateShipment(req CreateShipmentRequest) error {
	switch {
	case req.ClientID == "":
		return fmt.Errorf("%w: client_id is required", ErrValidation)
	case req.ClientName == "":
		return fmt.Errorf("%w: client_name is required", ErrValidation)
	case req.ClientEmail == "":
		return fmt.Errorf("%w: client_email is required", ErrValidation)
	case req.FromStation == "":
		return fmt.Errorf("%w: from_station is required", ErrValidation)
	case req.ToStation == "":
		return fmt.Errorf("%w: to_station is required", ErrValidation)
	case req.FromStation == req.ToStation:
		return fmt.Errorf("%w: route must include different stations", ErrValidation)
	case req.Weight == "":
		return fmt.Errorf("%w: weight is required", ErrValidation)
	case req.Dimensions == "":
		return fmt.Errorf("%w: dimensions are required", ErrValidation)
	case req.Description == "":
		return fmt.Errorf("%w: description is required", ErrValidation)
	case req.Value == "":
		return fmt.Errorf("%w: declared value is required", ErrValidation)
	case req.QuantityPlaces <= 0:
		return fmt.Errorf("%w: quantity_places must be greater than zero", ErrValidation)
	case req.ReceiverName == nil || *req.ReceiverName == "":
		return fmt.Errorf("%w: receiver_name is required", ErrValidation)
	case req.ReceiverPhone == nil || *req.ReceiverPhone == "":
		return fmt.Errorf("%w: receiver_phone is required", ErrValidation)
	}
	return nil
}

func validateEditableShipment(shipment model.Shipment) error {
	switch {
	case shipment.ClientName == "":
		return fmt.Errorf("%w: client_name is required", ErrValidation)
	case shipment.ClientEmail == "":
		return fmt.Errorf("%w: client_email is required", ErrValidation)
	case shipment.FromStation == "":
		return fmt.Errorf("%w: from_station is required", ErrValidation)
	case shipment.ToStation == "":
		return fmt.Errorf("%w: to_station is required", ErrValidation)
	case shipment.FromStation == shipment.ToStation:
		return fmt.Errorf("%w: route must include different stations", ErrValidation)
	case shipment.Weight == "":
		return fmt.Errorf("%w: weight is required", ErrValidation)
	case shipment.Dimensions == "":
		return fmt.Errorf("%w: dimensions are required", ErrValidation)
	case shipment.Description == "":
		return fmt.Errorf("%w: description is required", ErrValidation)
	case shipment.Value == "":
		return fmt.Errorf("%w: declared value is required", ErrValidation)
	case shipment.QuantityPlaces <= 0:
		return fmt.Errorf("%w: quantity_places must be greater than zero", ErrValidation)
	case shipment.ReceiverName == nil || *shipment.ReceiverName == "":
		return fmt.Errorf("%w: receiver_name is required", ErrValidation)
	case shipment.ReceiverPhone == nil || *shipment.ReceiverPhone == "":
		return fmt.Errorf("%w: receiver_phone is required", ErrValidation)
	}
	return nil
}
