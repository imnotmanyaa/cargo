package api

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"cargo/backend/internal/model"

	"github.com/go-chi/chi/v5"
)

func (s *Server) mountTransitRoutes(r chi.Router) {
	r.Get("/transit/incoming", s.handleTransitIncoming)
	r.Get("/transit/outgoing", s.handleTransitOutgoing)
	r.Post("/shipments/{id}/mark-transit", s.handleMarkTransit)
	r.Post("/shipments/{id}/transit", s.handleLegacyTransit)
	// Mobile group: проверка без изменения статуса.
	r.Get("/shipments/{id}/auditor-check", s.handleAuditorCheck)
}

func (s *Server) handleTransitIncoming(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.mustAuth(w, r); !ok {
		return
	}
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
	if _, ok := s.mustAuth(w, r); !ok {
		return
	}
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
	if err := s.requireRole(user, model.RoleLoading, model.RoleTransit, model.RoleReceiver, model.RoleManager, model.RoleAdmin); err != nil {
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
	// Если груз ещё не достиг конечной точки — отметить как транзит.
	// Если сканирование происходит в Карагандe (транзитный хаб, ТЗ п.4),
	// это стандартная операция: груз следует дальше → принудительный транзит.
	shipment, err = s.services.Shipments.MarkTransit(r.Context(), chi.URLParam(r, "id"), req.CurrentStation, &user.ID, &user.Name)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	s.socket.BroadcastToRoom("/", "station:"+shipment.CurrentStation, "shipment-updated", shipment)
	writeJSON(w, http.StatusOK, shipment)
}

// handleAuditorCheck — mobile group сканирует груз только для проверки (без изменения статуса).
// GET /api/shipments/{id}/auditor-check?station=<station>
func (s *Server) handleAuditorCheck(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleMobileGroup, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	shipmentID := chi.URLParam(r, "id")
	shipment, err := s.services.Shipments.Get(r.Context(), shipmentID)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	// Проверка: ожидаемся ли груз на этой станции
	queriedStation := r.URL.Query().Get("station")
	if queriedStation == "" {
		queriedStation = user.Station
	}
	stationMatch := shipment.CurrentStation == queriedStation ||
		shipment.FromStation == queriedStation ||
		shipment.ToStation == queriedStation

	checkedAt := time.Now().UTC()

	// Point 5: if unauthorized cargo is scanned by mobile group,
	// managers must receive a detailed notification.
	if !stationMatch && user.Role == model.RoleMobileGroup {
		employees, err := s.services.Admin.ListEmployees(r.Context())
		if err == nil {
			var recipients []model.User
			recipientIDs := map[string]struct{}{}
			addRecipient := func(u model.User) {
				if _, exists := recipientIDs[u.ID]; exists {
					return
				}
				recipientIDs[u.ID] = struct{}{}
				recipients = append(recipients, u)
			}
			normalizeStation := func(v string) string {
				return strings.ToLower(strings.TrimSpace(v))
			}
			targetStations := map[string]struct{}{}
			if s := normalizeStation(queriedStation); s != "" {
				targetStations[s] = struct{}{}
			}
			// Also notify leaders for the station where shipment is currently expected.
			if s := normalizeStation(shipment.CurrentStation); s != "" {
				targetStations[s] = struct{}{}
			}
			if shipment.NextStation != nil {
				if s := normalizeStation(*shipment.NextStation); s != "" {
					targetStations[s] = struct{}{}
				}
			}
			if s := normalizeStation(shipment.FromStation); s != "" {
				targetStations[s] = struct{}{}
			}
			if s := normalizeStation(shipment.ToStation); s != "" {
				targetStations[s] = struct{}{}
			}
			// Include all stations across the route.
			for _, routeStation := range shipment.Route {
				if s := normalizeStation(routeStation); s != "" {
					targetStations[s] = struct{}{}
				}
			}

			stationLeadersCount := 0
			for _, item := range employees {
				if item.Role != model.RoleManager && item.Role != model.RoleDirectionHead {
					continue
				}
				if item.Station != nil {
					if _, ok := targetStations[normalizeStation(*item.Station)]; ok {
					addRecipient(item)
					stationLeadersCount++
					}
				}
			}
			// Always notify chief heads globally (admins are excluded).
			for _, item := range employees {
				if item.Role == model.RoleChiefHead {
					addRecipient(item)
				}
			}
			// Fallback: if no station-scoped leaders found, notify all managers and direction heads.
			if stationLeadersCount == 0 {
				for _, item := range employees {
					if item.Role == model.RoleManager || item.Role == model.RoleDirectionHead {
						addRecipient(item)
					}
				}
			}

			details := fmt.Sprintf(
				"Несанкционированное сканирование груза %s\nВремя: %s\nСотрудник: %s\nСтанция сканирования: %s\nТекущая станция груза: %s\nСледующая станция: %s\nМаршрут: %s -> %s",
				shipment.ShipmentNumber,
				checkedAt.Format("02.01.2006 15:04:05"),
				user.Name,
				queriedStation,
				shipment.CurrentStation,
				func() string {
					if shipment.NextStation == nil {
						return "не определена"
					}
					return *shipment.NextStation
				}(),
				shipment.FromStation,
				shipment.ToStation,
			)
			for _, manager := range recipients {
				notification, err := s.services.Notifications.Create(r.Context(), model.Notification{
					UserID:    manager.ID,
					Message:   details,
					Type:      "unauthorized_shipment_scan",
					RelatedID: &shipment.ID,
					CreatedAt: checkedAt,
				})
				if err == nil {
					s.socket.BroadcastToRoom("/", "user:"+manager.ID, "notification:new", notification)
				}
			}
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"shipment":      shipment,
		"station_match": stationMatch,
		"checked_at":    checkedAt,
		"auditor":       user.Name,
	})
}
