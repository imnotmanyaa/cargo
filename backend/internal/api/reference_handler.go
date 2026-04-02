package api

import (
	"net/http"

	"cargo/backend/internal/model"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func (s *Server) mountReferenceRoutes(r chi.Router) {
	r.Get("/roles", s.handleListRoles)
	r.Get("/stations", s.handleListStations)
	r.Post("/stations", s.handleCreateStation)
	r.Put("/stations/{id}", s.handleUpdateStation)
}

func (s *Server) handleListRoles(w http.ResponseWriter, r *http.Request) {
	roles, err := s.services.Reference.ListRoles(r.Context())
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, roles)
}

func (s *Server) handleListStations(w http.ResponseWriter, r *http.Request) {
	stations, err := s.services.Reference.ListStations(r.Context())
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, stations)
}

func (s *Server) handleCreateStation(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	var station model.Station
	if !decodeJSON(w, r, &station) {
		return
	}
	if station.ID == "" {
		station.ID = uuid.NewString()
	}
	created, err := s.services.Reference.CreateStation(r.Context(), station)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

func (s *Server) handleUpdateStation(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	var station model.Station
	if !decodeJSON(w, r, &station) {
		return
	}
	station.ID = chi.URLParam(r, "id")
	updated, err := s.services.Reference.UpdateStation(r.Context(), station)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, updated)
}
