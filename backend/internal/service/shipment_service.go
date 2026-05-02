package service

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"cargo/backend/internal/model"

	"github.com/google/uuid"
	"math/rand"
	"cargo/backend/internal/whatsapp"
)

type CreateShipmentRequest struct {
	ClientID        string
	ClientName      string
	ClientEmail     string
	FromStation     string
	ToStation       string
	DepartureDate   time.Time
	Weight          string
	Dimensions      string
	Description     string
	Value           string
	Cost            float64
	QuantityPlaces  int
	ReceiverName    *string
	ReceiverPhone   *string
	CreatedBy       *string
	IsDoorToDoor    bool
	ClientRole      string
	PickupAddress   *string
	DeliveryAddress *string
	DoorToDoorPhone *string
	SenderPhone     *string
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
	req.FromStation = strings.TrimSpace(req.FromStation)
	req.ToStation = strings.TrimSpace(req.ToStation)

	if err := validateCreateShipment(req); err != nil {
		return model.Shipment{}, err
	}

	// Fetch client to determine role for door-to-door surcharge
	client, _ := s.repo.GetUserByID(ctx, req.ClientID)
	
	// Determine if surcharge applies: anything NOT explicitly corporate/legal (Фаза 5)
	isIndividual := client.Role != model.RoleCorporate && req.ClientRole != string(model.RoleCorporate)

	// If cost is 0 or very low, try to calculate it correctly including surcharges
	if req.Cost <= 0 {
		req.Cost = calculateCostByTariff(req.FromStation, req.ToStation, req.Weight, req.Description, req.IsDoorToDoor, isIndividual)
	} else if req.IsDoorToDoor && isIndividual {
		// If cost was provided but seems to be missing the door-to-door surcharge, we can't easily know.
		// However, the policy says it MUST be +10000. 
		// We already have logic in Create that adds it. Let's keep it robust.
		// If the frontend already added it, this might double it. 
		// BUT the user says "it wasn't added", so let's ensure it is.
		// A better way: if the cost is exactly the base cost, add it.
		base := calculateCostByTariff(req.FromStation, req.ToStation, req.Weight, req.Description, false, false)
		if req.Cost <= base + 5000 { // base + small surcharges but definitely no 10k
			req.Cost += 10000
		}
	}

	now := time.Now().UTC()
	route := calculateRoute(req.FromStation, req.ToStation)
	var nextStation *string
	if len(route) > 1 {
		nextStation = &route[1]
	}
	number := "SH-" + fmt.Sprintf("%06d", now.UnixNano()%1000000)
	pickupCode := fmt.Sprintf("%04d", rand.Intn(10000))
	issueCode := fmt.Sprintf("%04d", rand.Intn(10000))
	shipment := model.Shipment{
		PickupCode: &pickupCode,
		IssueCode: &issueCode,
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
		IsDoorToDoor:    req.IsDoorToDoor,
		PickupAddress:   req.PickupAddress,
		DeliveryAddress: req.DeliveryAddress,
		DoorToDoorPhone: req.DoorToDoorPhone,
		SenderPhone:     req.SenderPhone,
		TrackingCode:    ptr(number),
		LastUpdatedAt:   now,
		CreatedBy:       req.CreatedBy,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if req.IsDoorToDoor {
		shipment.ShipmentStatus = model.ShipmentCreatedDoor
		shipment.Status = legacyStatusForLifecycle(model.ShipmentCreatedDoor)
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
	// Try UUID first
	shipment, err := s.repo.GetShipmentByID(ctx, id)
	if err == nil {
		return shipment, nil
	}
	// Fallback to ShipmentNumber/TrackingCode
	return s.repo.GetShipmentByTrackingCode(ctx, id)
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
	shipment.FromStation = strings.TrimSpace(shipment.FromStation)
	shipment.ToStation = strings.TrimSpace(shipment.ToStation)

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
	shipment, err := s.Get(ctx, id)
	if err != nil {
		return model.Shipment{}, err
	}
	client, _ := s.repo.GetUserByID(ctx, shipment.ClientID)
	isIndividual := client.Role != model.RoleCorporate
	
	cost := calculateCostByTariff(shipment.FromStation, shipment.ToStation, shipment.Weight, shipment.Description, shipment.IsDoorToDoor, isIndividual)
	if cost > 0 {
		shipment.Cost = cost
	} else if shipment.Cost == 0 {
		shipment.Cost = 5000 // Fallback
	}
	shipment.UpdatedAt = time.Now().UTC()
	shipment.LastUpdatedAt = shipment.UpdatedAt
	return s.repo.UpdateShipment(ctx, shipment)
}

func (s *ShipmentService) SendToPayment(ctx context.Context, id string) (model.Shipment, error) {
	return s.transition(ctx, id, model.ShipmentPaymentPending, nil, nil, nil, "Sent to payment", nil)
}

func (s *ShipmentService) CourierHandover(ctx context.Context, id string, operatorID, operatorName *string) (model.Shipment, error) {
	return s.transition(ctx, id, model.ShipmentReadyForLoading, operatorID, operatorName, nil, "Courier handover", nil)
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
			ShipmentID:      shipment.ID,
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
	shipment, err := s.Get(ctx, id)
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
		ShipmentID: shipment.ID,
		StationID:  station,
		UserID:     operatorID,
		EventTime:  time.Now().UTC(),
	})
	_ = s.repo.AddAuditLog(ctx, model.AuditLog{
		ID:         uuid.NewString(),
		UserID:     operatorID,
		EntityType: "shipment",
		EntityID:   shipment.ID,
		Action:     "TRANSIT_EVENT",
		NewValue:   ptr(station),
		StationID:  ptr(station),
		CreatedAt:  time.Now().UTC(),
	})
	return shipment, nil
}

func (s *ShipmentService) Arrive(ctx context.Context, id string, station string, operatorID, operatorName *string) (model.Shipment, *model.Notification, error) {
	shipment, err := s.Get(ctx, id)
	if err != nil {
		return model.Shipment{}, nil, err
	}
	if station != shipment.ToStation {
		return model.Shipment{}, nil, ErrForbidden
	}
	// Re-scan: if already arrived/issued at this station, return without error
	if shipment.ShipmentStatus == model.ShipmentArrived || shipment.ShipmentStatus == model.ShipmentReadyForIssue || shipment.ShipmentStatus == model.ShipmentIssued {
		return shipment, nil, nil
	}
	shipment, err = s.transition(ctx, id, model.ShipmentArrived, operatorID, operatorName, &station, "Shipment arrived", nil)
	if err != nil {
		return model.Shipment{}, nil, err
	}
	_, _ = s.repo.CreateArrivalEvent(ctx, model.ArrivalEvent{
		ID:                      uuid.NewString(),
		ShipmentID:              shipment.ID,
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

	if shipment.IsDoorToDoor {
		shipment, err = s.transition(ctx, id, model.ShipmentReadyForIssue, operatorID, operatorName, &station, "Ready for delivery task", nil)
		if err != nil {
			return model.Shipment{}, nil, err
		}
	}

		if shipment.IssueCode != nil && shipment.ReceiverPhone != nil && *shipment.ReceiverPhone != "" {
		go whatsapp.SendMessage(*shipment.ReceiverPhone, "Груз "+shipment.ShipmentNumber+" прибыл. Ваш PIN-код для получения: "+*shipment.IssueCode)
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
	shipment, err := s.Get(ctx, id)
	if err != nil {
		return model.Shipment{}, err
	}
	if shipment.ShipmentStatus != model.ShipmentReadyForIssue && shipment.ShipmentStatus != model.ShipmentArrived {
		return model.Shipment{}, ErrInvalidTransition
	}
	if shipment.PaymentRequired {
		return model.Shipment{}, ErrPaymentRequired
	}
	if req.ReceiverName == "" || req.ReceiverPhone == "" {
		return model.Shipment{}, fmt.Errorf("%w: receiver verification data is required", ErrValidation)
	}

	if shipment.ReceiverName == nil || shipment.ReceiverPhone == nil {
		// Fallback for old shipments created without receiver data:
		// Save the provided receiver information to the shipment
		shipment.ReceiverName = &req.ReceiverName
		shipment.ReceiverPhone = &req.ReceiverPhone
		s.repo.UpdateShipment(ctx, shipment)
	} else {
		// Strict verification for shipments that have receiver data
		if req.ReceiverName != *shipment.ReceiverName || req.ReceiverPhone != *shipment.ReceiverPhone {
			return model.Shipment{}, fmt.Errorf("%w: receiver verification failed", ErrForbidden)
		}
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
	if shipment.PaymentStatus != model.PaymentConfirmed || (shipment.ShipmentStatus != model.ShipmentPaid && shipment.ShipmentStatus != model.ShipmentReadyForLoading) {
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
		shipment.FromStation = strings.TrimSpace(*req.FromStation)
	}
	if req.ToStation != nil {
		shipment.ToStation = strings.TrimSpace(*req.ToStation)
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
	// Management roles can view shipments across the whole route/network.
	// Direction head can view shipments that are relevant to their station (route/from/to/current/next).
	if user.Role == model.RoleAdmin || user.Role == model.RoleManager || user.Role == model.RoleChiefHead {
		result.UserRole = "staff"
		result.AllowedActions = []string{"view"}
		return result, nil
	}
	if user.Role == model.RoleDirectionHead {
		station := strings.TrimSpace(user.Station)
		if station != "" {
			if station == shipment.FromStation || station == shipment.ToStation || station == shipment.CurrentStation || (shipment.NextStation != nil && station == *shipment.NextStation) || indexOf(shipment.Route, station) != -1 {
				result.UserRole = "staff"
				result.AllowedActions = []string{"view"}
				return result, nil
			}
		}
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

func (s *ShipmentService) LastTransitAtStation(ctx context.Context, shipmentID, station string) (*time.Time, error) {
	events, err := s.repo.ListTransitEvents(ctx, shipmentID)
	if err != nil {
		return nil, err
	}
	for i := len(events) - 1; i >= 0; i-- {
		if events[i].StationID == station {
			ts := events[i].EventTime
			return &ts, nil
		}
	}
	return nil, nil
}

func (s *ShipmentService) transition(ctx context.Context, id string, next model.ShipmentLifecycle, operatorID, operatorName, station *string, action string, transportUnitID *string, reason ...*string) (model.Shipment, error) {
	shipment, err := s.Get(ctx, id)
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
	if strings.HasPrefix(action, "Courier") && operatorID != nil {
		shipment.CourierID = operatorID
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
		ShipmentID:   shipment.ID,
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
		EntityID:   shipment.ID,
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
		model.ShipmentCreatedDoor:     {model.ShipmentPaymentPending, model.ShipmentPickupAssigned, model.ShipmentReadyForLoading, model.ShipmentCancelled},
		model.ShipmentPickupAssigned:  {model.ShipmentPickedUp, model.ShipmentCancelled},
		model.ShipmentPickedUp:        {model.ShipmentAtStationIntake, model.ShipmentReadyForLoading, model.ShipmentCancelled},
		model.ShipmentAtStationIntake: {model.ShipmentReadyForLoading, model.ShipmentPaymentPending, model.ShipmentCancelled},
		model.ShipmentCreated:         {model.ShipmentPaymentPending, model.ShipmentReadyForLoading, model.ShipmentCancelled},
		model.ShipmentPaymentPending:  {model.ShipmentPaid, model.ShipmentCancelled},
		model.ShipmentPaid:            {model.ShipmentPickupAssigned, model.ShipmentReadyForLoading, model.ShipmentOnHold},
		model.ShipmentReadyForLoading: {model.ShipmentLoaded, model.ShipmentOnHold},
		model.ShipmentLoaded:          {model.ShipmentInTransit, model.ShipmentArrived, model.ShipmentDamaged, model.ShipmentReadyForLoading},
		model.ShipmentInTransit:       {model.ShipmentArrived, model.ShipmentOnHold, model.ShipmentDamaged},
		model.ShipmentArrived:         {model.ShipmentReadyForIssue, model.ShipmentDamaged},
		model.ShipmentReadyForIssue:   {model.ShipmentIssued},
		model.ShipmentIssued:          {model.ShipmentClosed},
		model.ShipmentOnHold:          {model.ShipmentReadyForLoading, model.ShipmentInTransit, model.ShipmentArrived},
		model.ShipmentDamaged:         {model.ShipmentOnHold, model.ShipmentClosed},
		model.ShipmentCancelled:       {model.ShipmentDraft},
	}
	for _, a := range allowed[current] {
		if a == next {
			return true
		}
	}
	return false
}

func (s *ShipmentService) ListLoadedForTransit(ctx context.Context, delay time.Duration) ([]model.Shipment, error) {
	threshold := time.Now().UTC().Add(-delay)
	return s.repo.ListShipmentsByStatus(ctx, model.ShipmentLoaded, threshold)
}

func (s *ShipmentService) ListCourierTasks(ctx context.Context, station string) ([]model.Shipment, error) {
	items, err := s.repo.ListShipmentsByOriginStation(ctx, station)
	if err != nil {
		return nil, err
	}
	out := make([]model.Shipment, 0)
	for _, sh := range items {
		if !sh.IsDoorToDoor {
			continue
		}
		
		// "Забрать": from_station = station + statuses
		if sh.FromStation == station {
			switch sh.ShipmentStatus {
			case model.ShipmentCreatedDoor, model.ShipmentPaymentPending, model.ShipmentPaid, model.ShipmentPickupAssigned, model.ShipmentPickedUp, model.ShipmentReadyForLoading:
				out = append(out, sh)
				continue
			}
		}

		// "Доставить": to_station = station + statuses (READY_FOR_ISSUE, ISSUED, etc)
		// Or if courier is assigned, they might need to see it.
		if sh.ToStation == station {
			switch sh.ShipmentStatus {
			case model.ShipmentReadyForIssue, model.ShipmentIssued: // ISSUED might be needed if they want to see completed
				out = append(out, sh)
			}
		}
	}
	return out, nil
}

func (s *ShipmentService) CourierPickupStart(ctx context.Context, id string, operatorID, operatorName *string) (model.Shipment, error) {
	shipment, err := s.Get(ctx, id)
	if err != nil {
		return model.Shipment{}, err
	}
	if !shipment.IsDoorToDoor {
		return model.Shipment{}, fmt.Errorf("%w: pickup is available only for door-to-door shipments", ErrValidation)
	}
	return s.transition(ctx, id, model.ShipmentPickupAssigned, operatorID, operatorName, nil, "Courier pickup assigned", nil)
}

func (s *ShipmentService) CourierTakeTask(ctx context.Context, id string, operatorID, operatorName *string) (model.Shipment, error) {
	shipment, err := s.Get(ctx, id)
	if err != nil {
		return model.Shipment{}, err
	}
	// Transition to PICKUP_ASSIGNED status when courier takes the task
	nextStatus := model.ShipmentPickupAssigned
	if !isAllowedTransition(shipment.ShipmentStatus, nextStatus) {
		// If already assigned (e.g. PAID), keep as pickup assigned by force through history only
		return s.transition(ctx, id, shipment.ShipmentStatus, operatorID, operatorName, nil, "Courier took task", nil)
	}
	res, err := s.transition(ctx, id, nextStatus, operatorID, operatorName, nil, "Courier took task", nil)
	if err == nil && res.PickupCode != nil && res.DoorToDoorPhone != nil && *res.DoorToDoorPhone != "" {
		go whatsapp.SendMessage(*res.DoorToDoorPhone, "К вам выехал курьер за грузом "+res.ShipmentNumber+". Ваш PIN-код для передачи груза: "+*res.PickupCode)
	}
	return res, err
}

func (s *ShipmentService) CourierDeliveryConfirm(ctx context.Context, id string, operatorID, operatorName *string) (model.Shipment, error) {
	shipment, err := s.Get(ctx, id)
	if err != nil {
		return model.Shipment{}, err
	}
	if !shipment.IsDoorToDoor {
		return model.Shipment{}, fmt.Errorf("%w: delivery confirmation is available only for door-to-door shipments", ErrValidation)
	}
	return s.transition(ctx, id, model.ShipmentIssued, operatorID, operatorName, nil, "Courier delivery confirmed", nil)
}

func (s *ShipmentService) CourierPickupConfirm(ctx context.Context, id string, operatorID, operatorName *string) (model.Shipment, error) {
	shipment, err := s.Get(ctx, id)
	if err != nil {
		return model.Shipment{}, err
	}
	if !shipment.IsDoorToDoor {
		return model.Shipment{}, fmt.Errorf("%w: pickup confirmation is available only for door-to-door shipments", ErrValidation)
	}
	return s.transition(ctx, id, model.ShipmentPickedUp, operatorID, operatorName, nil, "Courier pickup confirmed", nil)
}

func (s *ShipmentService) CourierPickupConfirmWithMeta(ctx context.Context, id string, operatorID, operatorName *string, confirmedAt time.Time, lat, lon *float64) (model.Shipment, error) {
	shipment, err := s.CourierPickupConfirm(ctx, id, operatorID, operatorName)
	if err != nil {
		return model.Shipment{}, err
	}
	details := fmt.Sprintf("Pickup confirmed at=%s", confirmedAt.UTC().Format(time.RFC3339))
	if lat != nil && lon != nil {
		details = fmt.Sprintf("%s lat=%.6f lon=%.6f", details, *lat, *lon)
	}
	_ = s.repo.AddShipmentHistory(ctx, model.ShipmentHistory{
		ShipmentID:   shipment.ID,
		Action:       "Courier pickup meta",
		OperatorID:   operatorID,
		OperatorName: operatorName,
		Details:      details,
		OldStatus:    ptr(string(model.ShipmentPickedUp)),
		NewStatus:    ptr(string(model.ShipmentPickedUp)),
		CreatedAt:    time.Now().UTC(),
	})
	return shipment, nil
}

func (s *ShipmentService) StationIntakeFromCourier(ctx context.Context, id string, operatorID, operatorName *string) (model.Shipment, error) {
	shipment, err := s.Get(ctx, id)
	if err != nil {
		return model.Shipment{}, err
	}
	if !shipment.IsDoorToDoor {
		return model.Shipment{}, fmt.Errorf("%w: station intake flow is available only for door-to-door shipments", ErrValidation)
	}
	return s.transition(ctx, id, model.ShipmentAtStationIntake, operatorID, operatorName, nil, "Station intake from courier", nil)
}

func (s *ShipmentService) ConfirmFinalWeightAtStation(ctx context.Context, id, finalWeight, reason string, operatorID, operatorName *string) (model.Shipment, error) {
	shipment, err := s.Get(ctx, id)
	if err != nil {
		return model.Shipment{}, err
	}
	if !shipment.IsDoorToDoor {
		return model.Shipment{}, fmt.Errorf("%w: final weight confirm is available only for door-to-door shipments", ErrValidation)
	}
	if shipment.ShipmentStatus != model.ShipmentAtStationIntake {
		return model.Shipment{}, fmt.Errorf("%w: final weight can be updated only at station intake stage", ErrInvalidState)
	}
	if strings.TrimSpace(finalWeight) == "" {
		return model.Shipment{}, fmt.Errorf("%w: final_weight is required", ErrValidation)
	}

	oldWeight := shipment.Weight
	shipment.Weight = strings.TrimSpace(finalWeight)
	shipment.UpdatedAt = time.Now().UTC()
	shipment.LastUpdatedAt = shipment.UpdatedAt
	updated, err := s.repo.UpdateShipment(ctx, shipment)
	if err != nil {
		return model.Shipment{}, err
	}

	details := fmt.Sprintf("Final station weight confirmed: old=%s new=%s", oldWeight, updated.Weight)
	var reasonPtr *string
	if strings.TrimSpace(reason) != "" {
		r := strings.TrimSpace(reason)
		reasonPtr = &r
		details = fmt.Sprintf("%s reason=%s", details, r)
	}
	_ = s.repo.AddShipmentHistory(ctx, model.ShipmentHistory{
		ShipmentID:   updated.ID,
		Action:       "Station weight confirm",
		OperatorID:   operatorID,
		OperatorName: operatorName,
		Details:      details,
		OldStatus:    ptr(string(model.ShipmentAtStationIntake)),
		NewStatus:    ptr(string(model.ShipmentAtStationIntake)),
		Reason:       reasonPtr,
		CreatedAt:    time.Now().UTC(),
	})

	return s.transition(ctx, updated.ID, model.ShipmentReadyForLoading, operatorID, operatorName, nil, "Ready for loading after station weight confirm", nil, reasonPtr)
}

// ConfirmIntakeResult содержит результат приёмки door-to-door посылки на складе.
type ConfirmIntakeResult struct {
	Shipment        model.Shipment
	RequiresPayment bool
	ExtraCharge     float64
}

// parseWeightKg извлекает числовое значение веса из строки типа "15 кг", "10.5kg", "7".
var weightDigits = regexp.MustCompile(`[\d]+\.?[\d]*`)

func parseWeightKg(s string) float64 {
	m := weightDigits.FindString(strings.TrimSpace(s))
	if m == "" {
		return 0
	}
	v, _ := strconv.ParseFloat(m, 64)
	return v
}

// ConfirmIntake — приёмка door-to-door посылки приемосдатчиком на станции отправления.
// Взвешивает посылку, рассчитывает доплату при перевесе, переводит в READY_FOR_LOADING.
func (s *ShipmentService) ConfirmIntake(ctx context.Context, id, actualWeight, station string, operatorID, operatorName *string) (ConfirmIntakeResult, *model.Notification, error) {
	shipment, err := s.Get(ctx, id)
	if err != nil {
		return ConfirmIntakeResult{}, nil, err
	}

	// Валидация
	if !shipment.IsDoorToDoor {
		return ConfirmIntakeResult{}, nil, fmt.Errorf("%w: подтверждение веса доступно только для посылок door-to-door", ErrValidation)
	}
	if shipment.ShipmentStatus != model.ShipmentPickedUp {
		return ConfirmIntakeResult{}, nil, fmt.Errorf("%w: посылка должна быть в статусе «Курьер забрал»", ErrInvalidState)
	}
	if shipment.FromStation != station {
		return ConfirmIntakeResult{}, nil, fmt.Errorf("%w: посылка отправляется со станции %s, ваша станция: %s", ErrForbidden, shipment.FromStation, station)
	}
	if strings.TrimSpace(actualWeight) == "" {
		return ConfirmIntakeResult{}, nil, fmt.Errorf("%w: фактический вес обязателен", ErrValidation)
	}

	// Парсим веса
	oldKg := parseWeightKg(shipment.Weight)
	newKg := parseWeightKg(actualWeight)

	// Рассчитываем доплату при перевесе
	var extraCharge float64
	requiresPayment := false
	if newKg > oldKg && oldKg > 0 {
		diff := newKg - oldKg
		var ratePerKg float64
		if oldKg > 0 {
			ratePerKg = shipment.Cost / oldKg
		} else {
			ratePerKg = 500 // fallback: 500 тг/кг
		}
		extraCharge = diff * ratePerKg
		requiresPayment = true
	}

	// Обновляем вес посылки
	oldWeightStr := shipment.Weight
	shipment.Weight = strings.TrimSpace(actualWeight)
	shipment.UpdatedAt = time.Now().UTC()
	shipment.LastUpdatedAt = shipment.UpdatedAt
	if requiresPayment {
		shipment.ExtraCharge = extraCharge
		shipment.PaymentRequired = true
	}
	updated, err := s.repo.UpdateShipment(ctx, shipment)
	if err != nil {
		return ConfirmIntakeResult{}, nil, err
	}

	// История изменений
	details := fmt.Sprintf("Приёмка на складе: вес изменён с %s на %s", oldWeightStr, actualWeight)
	if requiresPayment {
		details = fmt.Sprintf("%s | Доплата: %.0f тг", details, extraCharge)
	}
	_ = s.repo.AddShipmentHistory(ctx, model.ShipmentHistory{
		ShipmentID:   updated.ID,
		Action:       "Приёмка door-to-door на складе",
		OperatorID:   operatorID,
		OperatorName: operatorName,
		Details:      details,
		OldStatus:    ptr(string(model.ShipmentPickedUp)),
		NewStatus:    ptr(string(model.ShipmentPickedUp)),
		CreatedAt:    time.Now().UTC(),
	})

	// Уведомление клиенту о доплате
	var notification *model.Notification
	if requiresPayment {
		msg := fmt.Sprintf("Фактический вес вашей посылки %s изменён: %s → %s. Доплата: %.0f тг",
			updated.ShipmentNumber, oldWeightStr, actualWeight, extraCharge)
		n, err := s.repo.CreateNotification(ctx, model.Notification{
			UserID:    updated.ClientID,
			Message:   msg,
			Type:      "weight_changed",
			RelatedID: ptr(updated.ID),
			CreatedAt: time.Now().UTC(),
		})
		if err == nil {
			notification = &n
		}
	}

	// Переводим в READY_FOR_LOADING
	final, err := s.transition(ctx, updated.ID, model.ShipmentReadyForLoading, operatorID, operatorName, &station, "Приёмка на складе завершена", nil)
	if err != nil {
		return ConfirmIntakeResult{}, nil, err
	}
	final.PaymentRequired = requiresPayment
	final.ExtraCharge = extraCharge

	return ConfirmIntakeResult{
		Shipment:        final,
		RequiresPayment: requiresPayment,
		ExtraCharge:     extraCharge,
	}, notification, nil
}


func validateCreateShipment(req CreateShipmentRequest) error {
	from := strings.TrimSpace(req.FromStation)
	to := strings.TrimSpace(req.ToStation)

	switch {
	case req.ClientID == "":
		return fmt.Errorf("%w: client_id is required", ErrValidation)
	case req.ClientName == "":
		return fmt.Errorf("%w: client_name is required", ErrValidation)
	case req.ClientEmail == "" && req.ClientID == "":
		return fmt.Errorf("%w: client_email is required", ErrValidation)
	case from == "":
		return fmt.Errorf("%w: from_station is required", ErrValidation)
	case to == "":
		return fmt.Errorf("%w: to_station is required", ErrValidation)
	case strings.EqualFold(from, to):
		return fmt.Errorf("%w: route must include different stations", ErrValidation)
	case req.Weight == "":
		return fmt.Errorf("%w: weight is required", ErrValidation)
	case req.QuantityPlaces <= 0:
		return fmt.Errorf("%w: quantity_places must be greater than zero", ErrValidation)
	}
	return nil
}

func validateEditableShipment(shipment model.Shipment) error {
	from := strings.TrimSpace(shipment.FromStation)
	to := strings.TrimSpace(shipment.ToStation)

	switch {
	case shipment.ClientName == "":
		return fmt.Errorf("%w: client_name is required", ErrValidation)
	case shipment.ClientEmail == "":
		return fmt.Errorf("%w: client_email is required", ErrValidation)
	case from == "":
		return fmt.Errorf("%w: from_station is required", ErrValidation)
	case to == "":
		return fmt.Errorf("%w: to_station is required", ErrValidation)
	case strings.EqualFold(from, to):
		return fmt.Errorf("%w: route must include different stations", ErrValidation)
	case shipment.Weight == "":
		return fmt.Errorf("%w: weight is required", ErrValidation)
	case shipment.QuantityPlaces <= 0:
		return fmt.Errorf("%w: quantity_places must be greater than zero", ErrValidation)
	}
	return nil
}

func (s *ShipmentService) ClearPayment(ctx context.Context, id string) (model.Shipment, error) {
	shipment, err := s.Get(ctx, id)
	if err != nil {
		return model.Shipment{}, err
	}
	shipment.PaymentRequired = false
	shipment.ExtraCharge = 0
	return s.repo.UpdateShipment(ctx, shipment)
}
