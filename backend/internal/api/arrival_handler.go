package api

import (
	"net/http"

	"cargo/backend/internal/model"

	"github.com/go-chi/chi/v5"
)

func (s *Server) mountArrivalRoutes(r chi.Router) {
	r.Get("/arrivals/pending", s.handlePendingArrivals)
	r.Post("/shipments/{id}/arrive", s.handleArriveShipment)
	r.Post("/shipments/{id}/ready-for-issue", s.handleReadyForIssue)
}

func (s *Server) handlePendingArrivals(w http.ResponseWriter, r *http.Request) {
	shipments, err := s.services.Shipments.List(r.Context(), model.ShipmentFilter{
		Type:    "arrived",
		Station: r.URL.Query().Get("station"),
	})
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipments)
}

func (s *Server) handleArriveShipment(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleReceiver, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	var req struct {
		CurrentStation string `json:"current_station"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := s.requireStation(user, req.CurrentStation); err != nil {
		handleServiceError(w, err)
		return
	}
	shipment, notification, err := s.services.Shipments.Arrive(r.Context(), chi.URLParam(r, "id"), req.CurrentStation, &user.ID, &user.Name)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	s.socket.BroadcastToRoom("/", "station:"+shipment.CurrentStation, "shipment-updated", shipment)
	if notification != nil {
		s.socket.BroadcastToRoom("/", "user:"+notification.UserID, "notification:new", notification)
	}
	writeJSON(w, http.StatusOK, shipment)
}

func (s *Server) handleReadyForIssue(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleReceiver, model.RoleIssue, model.RoleAdmin); err != nil {
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
	shipment, err := s.services.Shipments.ReadyForIssue(r.Context(), chi.URLParam(r, "id"), &user.ID, &user.Name)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipment)
}
