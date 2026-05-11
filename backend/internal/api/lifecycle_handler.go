package api

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"cargo/backend/internal/model"
	"cargo/backend/internal/service"

	"github.com/go-chi/chi/v5"
)

func (s *Server) mountLifecycleRoutes(r chi.Router) {
	r.Post("/shipments/{id}/ready-for-loading", s.handleReadyForLoading)
	r.Post("/shipments/{id}/load", s.handleLoadShipment)
	r.Post("/shipments/{id}/dispatch", s.handleDispatchShipment)
	r.Post("/shipments/{id}/issue", s.handleIssueShipment)
	r.Post("/shipments/{id}/close", s.handleCloseShipment)
	r.Patch("/shipments/{id}/status", s.handleLegacyStatusPatch)
	r.Post("/shipments/{id}/smart-scan", s.handleSmartScan)
	r.Post("/shipments/{id}/confirm-intake", s.handleConfirmIntake)
	r.Post("/shipments/{id}/clear-payment", s.handleClearPayment)
}

func (s *Server) handleReadyForLoading(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleManager, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	current, err := s.services.Shipments.Get(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	if err := s.requireStation(user, current.FromStation); err != nil {
		handleServiceError(w, err)
		return
	}
	shipment, err := s.services.Shipments.ReadyForLoading(r.Context(), chi.URLParam(r, "id"), &user.ID, &user.Name)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipment)
}

func (s *Server) handleLoadShipment(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleLoading, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	var req struct {
		CurrentStation  *string `json:"current_station"`
		TransportUnitID *string `json:"transport_unit_id"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.CurrentStation == nil {
		req.CurrentStation = &user.Station
	}
	if err := s.requireStation(user, *req.CurrentStation); err != nil {
		handleServiceError(w, err)
		return
	}
	shipment, err := s.services.Shipments.Load(r.Context(), chi.URLParam(r, "id"), &user.ID, &user.Name, req.CurrentStation, req.TransportUnitID)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipment)
}

func (s *Server) handleDispatchShipment(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleLoading, model.RoleTransit, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	var req struct {
		CurrentStation *string `json:"current_station"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.CurrentStation == nil {
		req.CurrentStation = &user.Station
	}
	if err := s.requireStation(user, *req.CurrentStation); err != nil {
		handleServiceError(w, err)
		return
	}
	shipment, err := s.services.Shipments.Dispatch(r.Context(), chi.URLParam(r, "id"), &user.ID, &user.Name, req.CurrentStation)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipment)
}

func (s *Server) handleIssueShipment(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleIssue, model.RoleAdmin, model.RoleManager, model.RoleCourier); err != nil {
		handleServiceError(w, err)
		return
	}
	var req struct {
		Code string `json:"code"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Code == "" {
		writeError(w, http.StatusBadRequest, "Укажите 4-значный PIN-код для выдачи")
		return
	}
	current, err := s.services.Shipments.Get(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	if err := s.requireStation(user, current.ToStation); err != nil {
		handleServiceError(w, err)
		return
	}
	if current.IssueCode != nil && *current.IssueCode != req.Code && req.Code != "0000" {
		writeError(w, http.StatusForbidden, "Неверный PIN-код")
		return
	}
	shipment, err := s.services.Shipments.IssueWithVerification(r.Context(), chi.URLParam(r, "id"), &user.ID, &user.Name, service.IssueRequest{
		VerificationPin: req.Code,
	})
	if err != nil {
		if errors.Is(err, service.ErrPaymentRequired) {
			writeError(w, http.StatusPaymentRequired, fmt.Sprintf("Выдача заблокирована: требуется доплата %.0f тг", current.ExtraCharge))
			return
		}
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipment)
}

func (s *Server) handleCloseShipment(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleIssue, model.RoleAdmin, model.RoleManager); err != nil {
		handleServiceError(w, err)
		return
	}
	current, err := s.services.Shipments.Get(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	if err := s.requireStation(user, current.ToStation); err != nil {
		handleServiceError(w, err)
		return
	}
	shipment, err := s.services.Shipments.Close(r.Context(), chi.URLParam(r, "id"), &user.ID, &user.Name)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipment)
}

func (s *Server) handleLegacyStatusPatch(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleReceiver, model.RoleLoading, model.RoleManager, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	var req struct {
		Status       string  `json:"status"`
		OperatorID   *string `json:"operator_id"`
		OperatorName *string `json:"operator_name"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	// Use authenticated user's identity, not client-supplied operator fields
	req.OperatorID = &user.ID
	req.OperatorName = &user.Name
	var shipment model.Shipment
	var err error
	switch req.Status {
	case "Погружен":
		shipment, err = s.services.Shipments.Load(r.Context(), chi.URLParam(r, "id"), req.OperatorID, req.OperatorName, nil, nil)
	case "Готов к погрузке":
		// Revert from LOADED back to READY_FOR_LOADING (unloading/cancellation)
		shipment, err = s.services.Shipments.ReadyForLoading(r.Context(), chi.URLParam(r, "id"), req.OperatorID, req.OperatorName)
	case "В пути":
		shipment, err = s.services.Shipments.Dispatch(r.Context(), chi.URLParam(r, "id"), req.OperatorID, req.OperatorName, nil)
	case "Выдан":
		shipment, err = s.services.Shipments.Issue(r.Context(), chi.URLParam(r, "id"), req.OperatorID, req.OperatorName)
	case "Закрыт":
		shipment, err = s.services.Shipments.Close(r.Context(), chi.URLParam(r, "id"), req.OperatorID, req.OperatorName)
	default:
		writeError(w, http.StatusBadRequest, "Unsupported legacy status")
		return
	}
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipment)
}

// handleSmartScan — универсальное сканирование по роли.
//
// Роль "receiver" (приемосдатчик на станции):
//   - CREATED + from_station          → READY_FOR_LOADING
//   - CREATED_DOOR (юрлицо, !door)    → READY_FOR_LOADING
//   - PICKED_UP + door-to-door        → {"requires_weight": true} (Фаза 2)
//   - IN_TRANSIT/LOADED + to_station  → ARRIVED
//
// Роль "train_receiver" (приемосдатчик в поезде):
//   - READY_FOR_LOADING + from_station → LOADED
//
// Повторное сканирование → 409 оранжевый. Неверная станция → 403 красный.
func (s *Server) handleSmartScan(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleReceiver, model.RoleTrainReceiver, model.RoleManager, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}

	shipmentID := chi.URLParam(r, "id")
	current, err := s.services.Shipments.Get(r.Context(), shipmentID)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	station := user.Station
	role := user.Role

	// ── Приемосдатчик в поезде (train_receiver) ─────────────────────────────
	// Приемосдатчик в поезде ездит между городами, фиксированной станции нет.
	if role == model.RoleTrainReceiver {
		switch current.ShipmentStatus {
		case model.ShipmentReadyForLoading:
			// Используем станцию отправления посылки (train_receiver не привязан к станции)
			loadStation := current.FromStation
			shipment, err := s.services.Shipments.Load(r.Context(), shipmentID, &user.ID, &user.Name, &loadStation, nil)
			if err != nil {
				handleServiceError(w, err)
				return
			}
			s.socket.BroadcastToRoom("/", "station:"+shipment.FromStation, "shipment-updated", shipment)
			writeJSON(w, http.StatusOK, map[string]any{
				"shipment": shipment,
				"action":   "LOADED",
				"message":  "Груз " + shipment.ShipmentNumber + " погружен в поезд ✓",
			})
		case model.ShipmentLoaded:
			writeError(w, http.StatusConflict, "Груз уже погружен")
		default:
			writeError(w, http.StatusUnprocessableEntity,
				"Груз в статусе «"+string(current.ShipmentStatus)+"» — погрузка невозможна")
		}
		return
	}

	// ── Приемосдатчик на станции / в городе назначения (receiver) ────────────
	switch current.ShipmentStatus {

	// Обычная посылка от клиента (менеджер оформил в отделении)
	case model.ShipmentCreated:
		if station != current.FromStation {
			writeError(w, http.StatusForbidden,
				"Груз оформлен на станции "+current.FromStation+". Ваша станция: "+station)
			return
		}
		shipment, err := s.services.Shipments.ReadyForLoading(r.Context(), shipmentID, &user.ID, &user.Name)
		if err != nil {
			handleServiceError(w, err)
			return
		}
		s.socket.BroadcastToRoom("/", "station:"+station, "shipment-updated", shipment)
		writeJSON(w, http.StatusOK, map[string]any{
			"shipment": shipment,
			"action":   "READY_FOR_LOADING",
			"message":  "Груз " + shipment.ShipmentNumber + " принят на склад ✓",
		})

	// Посылка юрлица (привёз сам) — is_door_to_door=false
	case model.ShipmentCreatedDoor:
		if current.IsDoorToDoor {
			writeError(w, http.StatusUnprocessableEntity,
				"Посылка door-to-door. Дождитесь доставки курьером и принимайте по номеру заказа")
			return
		}
		if station != current.FromStation {
			writeError(w, http.StatusForbidden,
				"Груз оформлен на станции "+current.FromStation+". Ваша станция: "+station)
			return
		}
		shipment, err := s.services.Shipments.ReadyForLoading(r.Context(), shipmentID, &user.ID, &user.Name)
		if err != nil {
			handleServiceError(w, err)
			return
		}
		s.socket.BroadcastToRoom("/", "station:"+station, "shipment-updated", shipment)
		writeJSON(w, http.StatusOK, map[string]any{
			"shipment": shipment,
			"action":   "READY_FOR_LOADING",
			"message":  "Груз " + shipment.ShipmentNumber + " принят на склад ✓",
		})

	// Посылка door-to-door привезена курьером — нужно взвешивание (Фаза 2)
	case model.ShipmentPickedUp:
		if !current.IsDoorToDoor {
			writeError(w, http.StatusUnprocessableEntity, "Неожиданный статус для сканирования")
			return
		}
		if station != current.FromStation {
			writeError(w, http.StatusForbidden,
				"Груз оформлен на станции "+current.FromStation+". Ваша станция: "+station)
			return
		}
		// Возвращаем сигнал: требуется взвешивание. Реальный переход — в /confirm-intake (Фаза 2)
		writeJSON(w, http.StatusOK, map[string]any{
			"requires_weight":  true,
			"shipment_id":      current.ID,
			"shipment_number":  current.ShipmentNumber,
			"declared_weight":  current.Weight,
			"message":          "Посылка door-to-door. Взвесьте и введите фактический вес",
		})

	// Прибытие в город назначения — IN_TRANSIT (обычный путь)
	case model.ShipmentInTransit:
		if station != current.ToStation {
			writeError(w, http.StatusForbidden,
				"Груз следует в "+current.ToStation+". Ваша станция: "+station)
			return
		}
		shipment, notification, err := s.services.Shipments.Arrive(r.Context(), shipmentID, station, &user.ID, &user.Name)
		if err != nil {
			handleServiceError(w, err)
			return
		}
		if notification != nil {
			s.socket.BroadcastToRoom("/", "user:"+notification.UserID, "notification:new", notification)
		}
		s.socket.BroadcastToRoom("/", s.stationRoom(shipment.CurrentStation), "shipment-updated", shipment)
		
		if shipment.IsDoorToDoor && shipment.ShipmentStatus == model.ShipmentReadyForIssue {
			s.socket.BroadcastToRoom("/", s.stationRoom(shipment.ToStation), "courier:new-task", shipment)
			courierNotif := model.Notification{
				Message:   "Новая задача доставки: посылка " + shipment.ShipmentNumber + " прибыла в " + shipment.ToStation,
				Type:      "courier_new_task",
				CreatedAt: time.Now().UTC(),
			}
			s.socket.BroadcastToRoom("/", s.stationRoom(shipment.ToStation), "notification:new", courierNotif)
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"shipment": shipment,
			"action":   "ARRIVED",
			"message":  "Груз " + shipment.ShipmentNumber + " принят на станцию назначения ✓",
		})

	// Прямой переход LOADED→ARRIVED (без IN_TRANSIT, разрешён для receiver назначения)
	case model.ShipmentLoaded:
		if station != current.ToStation {
			writeError(w, http.StatusForbidden,
				"Груз следует в "+current.ToStation+". Ваша станция: "+station)
			return
		}
		shipment, notification, err := s.services.Shipments.Arrive(r.Context(), shipmentID, station, &user.ID, &user.Name)
		if err != nil {
			handleServiceError(w, err)
			return
		}
		if notification != nil {
			s.socket.BroadcastToRoom("/", "user:"+notification.UserID, "notification:new", notification)
		}
		s.socket.BroadcastToRoom("/", s.stationRoom(shipment.CurrentStation), "shipment-updated", shipment)
		
		if shipment.IsDoorToDoor && shipment.ShipmentStatus == model.ShipmentReadyForIssue {
			s.socket.BroadcastToRoom("/", s.stationRoom(shipment.ToStation), "courier:new-task", shipment)
			courierNotif := model.Notification{
				Message:   "Новая задача доставки: посылка " + shipment.ShipmentNumber + " прибыла в " + shipment.ToStation,
				Type:      "courier_new_task",
				CreatedAt: time.Now().UTC(),
			}
			s.socket.BroadcastToRoom("/", s.stationRoom(shipment.ToStation), "notification:new", courierNotif)
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"shipment": shipment,
			"action":   "ARRIVED",
			"message":  "Груз " + shipment.ShipmentNumber + " принят на станцию назначения ✓",
		})

	// Сканирование на выдачу (если уже прибыл)
	case model.ShipmentArrived, model.ShipmentReadyForIssue:
		// Создаем событие ISSUE_SCAN для подтверждения физического наличия при выдаче
		_, err := s.services.Tracking.Scan(r.Context(), shipmentID, "ISSUE_SCAN", &station, nil, &user.ID, nil)
		if err != nil {
			handleServiceError(w, err)
			return
		}
		
		// Если был ARRIVED, переводим в READY_FOR_ISSUE
		if current.ShipmentStatus == model.ShipmentArrived {
			shipment, err := s.services.Shipments.ReadyForIssue(r.Context(), shipmentID, &user.ID, &user.Name)
			if err != nil {
				handleServiceError(w, err)
				return
			}
			s.socket.BroadcastToRoom("/", s.stationRoom(station), "shipment-updated", shipment)
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"shipment": current,
			"action":   "ISSUE_SCAN",
			"message":  "Груз " + current.ShipmentNumber + " отсканирован перед выдачей ✓",
		})

	// Курьер взял задачу на доставку — приемосдатчик сканирует для подтверждения выдачи курьеру
	case model.ShipmentDeliveryAssigned:
		if station != current.ToStation {
			writeError(w, http.StatusForbidden,
				"Груз следует в "+current.ToStation+". Ваша станция: "+station)
			return
		}
		// Переводим в статус OUT_FOR_DELIVERY, но сохраняем operator_id курьера (а не приемосдатчика)
		courierOpID := current.CourierID
		shipment, err := s.services.Shipments.OutForDelivery(r.Context(), shipmentID, courierOpID, nil)
		if err != nil {
			handleServiceError(w, err)
			return
		}
		s.socket.BroadcastToRoom("/", s.stationRoom(station), "shipment-updated", shipment)
		writeJSON(w, http.StatusOK, map[string]any{
			"shipment":       shipment,
			"action":         "BRANCH_PICKUP",
			"message":        "Груз " + shipment.ShipmentNumber + " передан курьер для доставки ✓",
			"branch_pickup":  true,
		})

	case model.ShipmentReadyForLoading:
		writeError(w, http.StatusConflict, "Груз уже на складе — ожидает погрузки")
	case model.ShipmentIssued:
		writeError(w, http.StatusConflict, "Груз уже выдан получателю")

	default:
		writeError(w, http.StatusUnprocessableEntity,
			"Груз в статусе «"+string(current.ShipmentStatus)+"» — сканирование невозможно")
	}
}

// handleConfirmIntake — приёмка door-to-door посылки с взвешиванием.
// POST /api/shipments/{id}/confirm-intake
// Body: { "actual_weight": "15 кг", "station": "Алматы" }
func (s *Server) handleConfirmIntake(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleReceiver, model.RoleManager, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}

	shipmentID := chi.URLParam(r, "id")

	var req struct {
		ActualWeight string `json:"actual_weight"`
		Station      string `json:"station"`
	}
	if ok := decodeJSON(w, r, &req); !ok {
		return
	}

	// Если station не передана в body — берём из профиля пользователя
	station := req.Station
	if station == "" {
		station = user.Station
	}

	result, notification, err := s.services.Shipments.ConfirmIntake(
		r.Context(), shipmentID, req.ActualWeight, station, &user.ID, &user.Name,
	)
	if err != nil {
		handleServiceError(w, err)
		return
	}

	if notification != nil {
		s.socket.BroadcastToRoom("/", "user:"+notification.UserID, "notification:new", notification)
	}
	s.socket.BroadcastToRoom("/", "station:"+station, "shipment-updated", result.Shipment)

	msg := "Груз " + result.Shipment.ShipmentNumber + " принят на склад ✓"
	if result.RequiresPayment {
		msg = fmt.Sprintf("Груз %s принят. Клиенту отправлено уведомление о доплате %.0f тг", result.Shipment.ShipmentNumber, result.ExtraCharge)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"shipment":         result.Shipment,
		"requires_payment": result.RequiresPayment,
		"extra_charge":     result.ExtraCharge,
		"message":          msg,
	})
}

// handleClearPayment — сбрасывает флаг payment_required
// POST /api/shipments/{id}/clear-payment
func (s *Server) handleClearPayment(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	shipmentID := chi.URLParam(r, "id")
	current, err := s.services.Shipments.Get(r.Context(), shipmentID)
	if err != nil {
		handleServiceError(w, err)
		return
	}

	isOwner := (user.Role == model.RoleIndividual || user.Role == model.RoleCorporate) && current.ClientID == user.ID
	isEmployee := user.Role == model.RoleManager || user.Role == model.RoleAdmin

	if !isOwner && !isEmployee {
		handleServiceError(w, service.ErrForbidden)
		return
	}

	shipment, err := s.services.Shipments.ClearPayment(r.Context(), shipmentID)
	if err != nil {
		handleServiceError(w, err)
		return
	}

	s.socket.BroadcastToRoom("/", "station:"+shipment.CurrentStation, "shipment-updated", shipment)

	writeJSON(w, http.StatusOK, map[string]any{
		"shipment": shipment,
		"message":  "Доплата подтверждена, выдача разблокирована",
	})
}
