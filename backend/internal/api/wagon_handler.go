package api

import (
	"net/http"
	"time"

	"cargo/backend/internal/model"

	"github.com/go-chi/chi/v5"
)

func (s *Server) mountWagonRoutes(r chi.Router) {
	r.Get("/wagons", s.handleListWagons)
	r.Post("/wagons", s.handleCreateWagon)
	r.Get("/wagons/{id}", s.handleGetWagon)
	r.Get("/wagons/{id}/checklist", s.handleGetChecklist)
	r.Post("/wagons/{id}/assign/{shipmentID}", s.handleAssignShipment)
	r.Delete("/wagons/{id}/assign/{shipmentID}", s.handleRemoveShipment)
	r.Post("/wagons/{id}/scan/{shipmentID}", s.handleScanShipmentInWagon)
	r.Post("/wagons/{id}/missing/{shipmentID}", s.handleMarkMissing)
	// Отправка вагона — только если все грузы погружены/утеряны (ТЗ п.5)
	r.Post("/wagons/{id}/dispatch", s.handleDispatchWagon)
}

func (s *Server) handleCreateWagon(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleLoading, model.RoleManager, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	var req struct {
		WagonNumber   string `json:"wagon_number"`
		Destination   string `json:"destination"`
		DepartureDate string `json:"departure_date"`
		Capacity      int    `json:"capacity"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	departure := time.Now().UTC()
	if req.DepartureDate != "" {
		if parsed, err := time.Parse(time.RFC3339, req.DepartureDate); err == nil {
			departure = parsed
		}
	}
	wagon, err := s.services.Wagons.CreateWagon(r.Context(), req.WagonNumber, user.Station, req.Destination, departure, req.Capacity)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, wagon)
}

func (s *Server) handleListWagons(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	station := r.URL.Query().Get("station")
	if station == "" {
		station = user.Station
	}
	var statusFilter *model.WagonStatus
	if s := r.URL.Query().Get("status"); s != "" {
		st := model.WagonStatus(s)
		statusFilter = &st
	}
	wagons, err := s.services.Wagons.ListWagons(r.Context(), station, statusFilter)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, wagons)
}

func (s *Server) handleGetWagon(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.mustAuth(w, r); !ok {
		return
	}
	wagon, err := s.services.Wagons.GetWagon(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, wagon)
}

func (s *Server) handleGetChecklist(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.mustAuth(w, r); !ok {
		return
	}
	wagon, checklist, total, done, err := s.services.Wagons.GetChecklist(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"wagon":     wagon,
		"checklist": checklist,
		"total":     total,
		"done":      done,
		"complete":  total > 0 && done == total,
	})
}

func (s *Server) handleAssignShipment(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleLoading, model.RoleManager, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	wagon, err := s.services.Wagons.GetWagon(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	if err := s.requireStation(user, wagon.CurrentStation); err != nil {
		handleServiceError(w, err)
		return
	}
	if err := s.services.Wagons.AssignShipment(r.Context(), chi.URLParam(r, "id"), chi.URLParam(r, "shipmentID")); err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "assigned"})
}

func (s *Server) handleRemoveShipment(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleLoading, model.RoleManager, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	if err := s.services.Wagons.RemoveShipment(r.Context(), chi.URLParam(r, "id"), chi.URLParam(r, "shipmentID")); err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "removed"})
}

func (s *Server) handleScanShipmentInWagon(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleLoading, model.RoleReceiver, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	wagonQuery, err := s.services.Wagons.GetWagon(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	if err := s.requireStation(user, wagonQuery.CurrentStation); err != nil {
		handleServiceError(w, err)
		return
	}
	var req struct {
		Status string `json:"status"` // LOADED or UNLOADED
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Status == "" {
		req.Status = "LOADED"
	}
	wagon, checklist, allDone, err := s.services.Wagons.ScanShipmentInWagon(r.Context(),
		chi.URLParam(r, "id"),
		chi.URLParam(r, "shipmentID"),
		req.Status,
	)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"wagon":     wagon,
		"checklist": checklist,
		"all_done":  allDone,
	})
}

func (s *Server) handleMarkMissing(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleLoading, model.RoleReceiver, model.RoleManager, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	if err := s.services.Wagons.MarkMissingInWagon(r.Context(), chi.URLParam(r, "id"), chi.URLParam(r, "shipmentID")); err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "marked_missing"})
}

// handleDispatchWagon — отправить вагон в рейс.
// Проверяет: все грузы в чеклисте должны быть LOADED или MISSING (ТЗ п.5).
func (s *Server) handleDispatchWagon(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleLoading, model.RoleManager, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	wagonID := chi.URLParam(r, "id")

	wagon, checklist, total, done, err := s.services.Wagons.GetChecklist(r.Context(), wagonID)
	if err != nil {
		handleServiceError(w, err)
		return
	}

	// Считаем незавершённые (только PENDING блокирует отправку)
	pending := 0
	for _, ws := range checklist {
		if ws.Status == "PENDING" {
			pending++
		}
	}

	if pending > 0 {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error":   "Нельзя отправить вагон: не все грузы погружены или отмечены как утерянные",
			"total":   total,
			"done":    done,
			"pending": pending,
		})
		return
	}

	// Все грузы готовы — меняем статус вагона на IN_TRANSIT
	wagon.Status = model.WagonInTransit
	wagon.UpdatedAt = time.Now().UTC()
	updated, err := s.services.Wagons.DispatchWagon(r.Context(), wagon)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"wagon":   updated,
		"message": "Вагон отправлен в рейс",
	})
}
