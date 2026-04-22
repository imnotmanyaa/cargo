package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"cargo/backend/internal/model"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func (s *Server) mountReferenceRoutes(r chi.Router) {
	r.Get("/roles", s.handleListRoles)
	r.Get("/stations", s.handleListStations)
	r.Post("/stations", s.handleCreateStation)
	r.Put("/stations/{id}", s.handleUpdateStation)
	r.Post("/stations/import/osm-kz", s.handleImportStationsOSMKZ)
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

// handleImportStationsOSMKZ imports railway stations in Kazakhstan from OpenStreetMap (Overpass API).
// It upserts stations by a stable code derived from the OSM element ID.
func (s *Server) handleImportStationsOSMKZ(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleAdmin, model.RoleChiefHead); err != nil {
		handleServiceError(w, err)
		return
	}

	overpassQuery := `
[out:json][timeout:60];
area["ISO3166-1"="KZ"][admin_level=2]->.kz;
(
  nwr["railway"="station"](area.kz);
);
out center tags;`

	client := &http.Client{Timeout: 75 * time.Second}
	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, "https://overpass-api.de/api/interpreter", strings.NewReader(overpassQuery))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create request")
		return
	}
	req.Header.Set("Content-Type", "text/plain; charset=utf-8")

	resp, err := client.Do(req)
	if err != nil {
		writeError(w, http.StatusBadGateway, "failed to fetch OSM stations")
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		writeError(w, http.StatusBadGateway, "OSM overpass error")
		return
	}

	var payload struct {
		Elements []struct {
			Type   string            `json:"type"`
			ID     int64             `json:"id"`
			Lat    *float64          `json:"lat"`
			Lon    *float64          `json:"lon"`
			Center *struct {
				Lat float64 `json:"lat"`
				Lon float64 `json:"lon"`
			} `json:"center"`
			Tags map[string]string `json:"tags"`
		} `json:"elements"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadGateway, "failed to decode OSM response")
		return
	}

	imported := 0
	skipped := 0
	for _, el := range payload.Elements {
		name := strings.TrimSpace(el.Tags["name"])
		if name == "" {
			name = strings.TrimSpace(el.Tags["name:ru"])
		}
		if name == "" {
			skipped++
			continue
		}

		city := strings.TrimSpace(el.Tags["addr:city"])
		if city == "" {
			city = strings.TrimSpace(el.Tags["is_in:city"])
		}
		if city == "" {
			city = "—"
		}

		code := fmt.Sprintf("OSM-%s-%d", el.Type, el.ID)
		station := model.Station{
			ID:       uuid.NewString(),
			Name:     name,
			City:     city,
			Code:     code,
			IsActive: true,
		}
		if _, err := s.services.Reference.UpsertStationByCode(r.Context(), station); err != nil {
			// If name is duplicated with an existing station but code differs, skip.
			// We'll keep the existing manual record.
			skipped++
			continue
		}
		imported++
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"imported": imported,
		"skipped":  skipped,
	})
}
