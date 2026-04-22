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
	var items []model.AuditLog
	var err error
	if user.Role == model.RoleAdmin {
		items, err = s.services.Audit.List(r.Context())
	} else {
		items, err = s.services.Audit.ListByUser(r.Context(), user.ID)
	}
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}
