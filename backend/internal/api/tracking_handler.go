package api

import (
	"net/http"

	"cargo/backend/internal/model"

	"github.com/go-chi/chi/v5"
)

func (s *Server) mountTrackingRoutes(r chi.Router) {
	r.Get("/track/{tracking_code}", s.handleTrackShipment)
	r.Post("/scan", s.handleScanShipment)
	r.Get("/shipments/{id}/scan-events", s.handleScanEvents)
	r.Get("/shipments/{id}/tracking-history", s.handleTrackingHistory)
}

func (s *Server) handleTrackShipment(w http.ResponseWriter, r *http.Request) {
	shipment, history, err := s.services.Tracking.GetTracking(r.Context(), chi.URLParam(r, "tracking_code"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"shipment": shipment,
		"history":  history,
	})
}

func (s *Server) handleScanShipment(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleOperator, model.RoleLoading, model.RoleTransit, model.RoleReceiver, model.RoleIssue, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	var req struct {
		ShipmentID      string  `json:"shipment_id"`
		EventType       string  `json:"event_type"`
		StationID       *string `json:"station_id"`
		TransportUnitID *string `json:"transport_unit_id"`
		UserID          *string `json:"user_id"`
		Comment         *string `json:"comment"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.UserID == nil {
		req.UserID = &user.ID
	}
	if req.StationID != nil {
		if err := s.requireStation(user, *req.StationID); err != nil {
			handleServiceError(w, err)
			return
		}
	}
	event, err := s.services.Tracking.Scan(r.Context(), req.ShipmentID, req.EventType, req.StationID, req.TransportUnitID, req.UserID, req.Comment)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, event)
}

func (s *Server) handleScanEvents(w http.ResponseWriter, r *http.Request) {
	items, err := s.services.Tracking.ListScanEvents(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handleTrackingHistory(w http.ResponseWriter, r *http.Request) {
	items, err := s.services.Tracking.TrackingHistory(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}
