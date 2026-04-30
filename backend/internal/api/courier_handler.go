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
