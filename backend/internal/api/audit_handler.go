package api

import (
	"net/http"

	"cargo/backend/internal/model"

	"github.com/go-chi/chi/v5"
)

func (s *Server) mountAuditRoutes(r chi.Router) {
	r.Get("/audit/logs", s.handleAuditLogs)
}

func (s *Server) handleAuditLogs(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleAdmin, model.RoleManager); err != nil {
		handleServiceError(w, err)
		return
	}

	// Support filter by shipment number
	shipmentNum := r.URL.Query().Get("shipment")
	if shipmentNum != "" {
		items, err := s.services.Audit.ListByShipment(r.Context(), shipmentNum)
		if err != nil {
			handleServiceError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, items)
		return
	}

	// Admin sees all, manager sees all (filter by action is done on frontend)
	items, err := s.services.Audit.List(r.Context())
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}
