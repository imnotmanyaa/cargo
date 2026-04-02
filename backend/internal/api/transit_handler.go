package api

import (
	"net/http"

	"cargo/backend/internal/model"

	"github.com/go-chi/chi/v5"
)

func (s *Server) mountTransitRoutes(r chi.Router) {
	r.Get("/transit/incoming", s.handleTransitIncoming)
	r.Get("/transit/outgoing", s.handleTransitOutgoing)
	r.Post("/shipments/{id}/mark-transit", s.handleMarkTransit)
	r.Post("/shipments/{id}/transit", s.handleLegacyTransit)
}

func (s *Server) handleTransitIncoming(w http.ResponseWriter, r *http.Request) {
	shipments, err := s.services.Shipments.List(r.Context(), model.ShipmentFilter{
		Type:    "incoming",
		Station: r.URL.Query().Get("station"),
	})
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipments)
}

func (s *Server) handleTransitOutgoing(w http.ResponseWriter, r *http.Request) {
	shipments, err := s.services.Shipments.List(r.Context(), model.ShipmentFilter{
		Type:    "outgoing",
		Station: r.URL.Query().Get("station"),
	})
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipments)
}

func (s *Server) handleMarkTransit(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleTransit, model.RoleAdmin); err != nil {
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
	shipment, err := s.services.Shipments.MarkTransit(r.Context(), chi.URLParam(r, "id"), req.CurrentStation, &user.ID, &user.Name)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	s.socket.BroadcastToRoom("/", "station:"+shipment.CurrentStation, "shipment-updated", shipment)
	writeJSON(w, http.StatusOK, shipment)
}

func (s *Server) handleLegacyTransit(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleLoading, model.RoleTransit, model.RoleReceiver, model.RoleAdmin); err != nil {
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
	current, err := s.services.Shipments.Get(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}

	if req.CurrentStation == current.FromStation && (current.ShipmentStatus == model.ShipmentReadyForLoading || current.ShipmentStatus == model.ShipmentPaid) {
		if current.ShipmentStatus == model.ShipmentPaid {
			if _, err := s.services.Shipments.ReadyForLoading(r.Context(), current.ID, &user.ID, &user.Name); err != nil {
				handleServiceError(w, err)
				return
			}
		}
		shipment, err := s.services.Shipments.Load(r.Context(), current.ID, &user.ID, &user.Name, &req.CurrentStation, nil)
		if err != nil {
			handleServiceError(w, err)
			return
		}
		s.socket.BroadcastToRoom("/", "station:"+shipment.CurrentStation, "shipment-updated", shipment)
		writeJSON(w, http.StatusOK, shipment)
		return
	}

	if req.CurrentStation == current.FromStation && current.ShipmentStatus == model.ShipmentLoaded {
		shipment, err := s.services.Shipments.Dispatch(r.Context(), current.ID, &user.ID, &user.Name, &req.CurrentStation)
		if err != nil {
			handleServiceError(w, err)
			return
		}
		s.socket.BroadcastToRoom("/", "station:"+shipment.CurrentStation, "shipment-updated", shipment)
		writeJSON(w, http.StatusOK, shipment)
		return
	}

	shipment, notification, err := s.services.Shipments.Arrive(r.Context(), chi.URLParam(r, "id"), req.CurrentStation, &user.ID, &user.Name)
	if err == nil {
		s.socket.BroadcastToRoom("/", "station:"+shipment.CurrentStation, "shipment-updated", shipment)
		if notification != nil {
			s.socket.BroadcastToRoom("/", "user:"+notification.UserID, "notification:new", notification)
		}
		writeJSON(w, http.StatusOK, shipment)
		return
	}
	shipment, err = s.services.Shipments.MarkTransit(r.Context(), chi.URLParam(r, "id"), req.CurrentStation, &user.ID, &user.Name)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	s.socket.BroadcastToRoom("/", "station:"+shipment.CurrentStation, "shipment-updated", shipment)
	writeJSON(w, http.StatusOK, shipment)
}
