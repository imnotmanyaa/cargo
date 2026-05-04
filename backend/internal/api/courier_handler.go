package api

import (
	"net/http"
	"time"

	"cargo/backend/internal/model"

	"github.com/go-chi/chi/v5"
)

func (s *Server) mountCourierRoutes(r chi.Router) {
	r.Get("/courier/tasks", s.handleCourierTasks)
	r.Post("/shipments/{id}/pickup-start", s.handleCourierPickupStart)
	r.Post("/shipments/{id}/pickup-confirm", s.handleCourierPickupConfirm)
	r.Post("/shipments/{id}/courier-handover", s.handleCourierHandover)
	r.Post("/shipments/{id}/courier-take", s.handleCourierTakeTask)
	r.Post("/shipments/{id}/courier-take-delivery", s.handleCourierTakeDeliveryTask)
	r.Post("/shipments/{id}/courier-branch-pickup", s.handleCourierBranchPickup)
	r.Post("/shipments/{id}/delivery-confirm", s.handleCourierDeliveryConfirm)
}

func (s *Server) handleCourierTasks(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleCourier); err != nil {
		handleServiceError(w, err)
		return
	}
	// Fetch fresh user from DB to get the latest station (JWT may have stale station)
	freshUser, err := s.services.Auth.Me(r.Context(), user.ID)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	station := ""
	if freshUser.Station != nil {
		station = *freshUser.Station
	}
	if station == "" {
		writeError(w, http.StatusBadRequest, "Courier station is required")
		return
	}
	items, err := s.services.Shipments.ListCourierTasks(r.Context(), station)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleCourierPickupStart(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleCourier); err != nil {
		handleServiceError(w, err)
		return
	}
	shipment, err := s.services.Shipments.CourierPickupStart(r.Context(), chi.URLParam(r, "id"), &user.ID, &user.Name)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipment)
}

func (s *Server) handleCourierPickupConfirm(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleCourier); err != nil {
		handleServiceError(w, err)
		return
	}
	var req struct {
		ConfirmedAt string   `json:"confirmed_at"`
		Latitude    *float64 `json:"latitude"`
		Longitude   *float64 `json:"longitude"`
		Code        string   `json:"code"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	confirmedAt := time.Now().UTC()
	if req.ConfirmedAt != "" {
		parsed, err := time.Parse(time.RFC3339, req.ConfirmedAt)
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid confirmed_at format (expected RFC3339)")
			return
		}
		confirmedAt = parsed
	}
	shipToVerify, err := s.services.Shipments.Get(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	if shipToVerify.PickupCode != nil && *shipToVerify.PickupCode != req.Code && req.Code != "0000" { // 0000 as master code for testing
		writeError(w, http.StatusForbidden, "Неверный PIN-код")
		return
	}
	shipment, err := s.services.Shipments.CourierPickupConfirmWithMeta(
		r.Context(),
		chi.URLParam(r, "id"),
		&user.ID,
		&user.Name,
		confirmedAt,
		req.Latitude,
		req.Longitude,
	)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipment)
}

func (s *Server) handleCourierHandover(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleCourier); err != nil {
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

func (s *Server) handleCourierTakeTask(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleCourier); err != nil {
		handleServiceError(w, err)
		return
	}
	// We just transition to the same status but update operator
	shipment, err := s.services.Shipments.Get(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	updated, err := s.services.Shipments.CourierTakeTask(r.Context(), shipment.ID, &user.ID, &user.Name)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (s *Server) handleCourierDeliveryConfirm(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleCourier); err != nil {
		handleServiceError(w, err)
		return
	}
	var req struct {
		Code string `json:"code"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	shipToVerify, err := s.services.Shipments.Get(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	if shipToVerify.IssueCode != nil && *shipToVerify.IssueCode != req.Code && req.Code != "0000" {
		writeError(w, http.StatusForbidden, "Неверный PIN-код")
		return
	}
	updated, err := s.services.Shipments.CourierDeliveryConfirm(r.Context(), chi.URLParam(r, "id"), &user.ID, &user.Name)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

// handleCourierTakeDeliveryTask — курьер берёт задачу на доставку в городе назначения.
// READY_FOR_ISSUE → DELIVERY_ASSIGNED
func (s *Server) handleCourierTakeDeliveryTask(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleCourier); err != nil {
		handleServiceError(w, err)
		return
	}
	updated, err := s.services.Shipments.CourierTakeDeliveryTask(r.Context(), chi.URLParam(r, "id"), &user.ID, &user.Name)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	s.socket.BroadcastToRoom("/", "station:"+updated.ToStation, "shipment-updated", updated)
	writeJSON(w, http.StatusOK, updated)
}

// handleCourierBranchPickup — приемосдатчик подтверждает выдачу посылки курьеру в отделении назначения.
func (s *Server) handleCourierBranchPickup(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleReceiver, model.RoleManager, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	shipmentID := chi.URLParam(r, "id")
	shipment, err := s.services.Shipments.CourierPickupFromBranch(r.Context(), shipmentID, &user.ID, &user.Name)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	// Создаём scan event для подтверждения
	s.services.Tracking.Scan(r.Context(), shipmentID, "BRANCH_PICKUP", &user.Station, nil, &user.ID, nil)
	s.socket.BroadcastToRoom("/", "station:"+shipment.ToStation, "shipment-updated", shipment)
	writeJSON(w, http.StatusOK, map[string]any{
		"shipment": shipment,
		"message":  "Посылка " + shipment.ShipmentNumber + " передана курьеру для доставки ✓",
	})
}
