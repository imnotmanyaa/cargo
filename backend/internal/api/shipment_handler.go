package api

import (
	"log"
	"net/http"
	"time"

	"cargo/backend/internal/model"
	"cargo/backend/internal/service"

	"github.com/go-chi/chi/v5"
)

func (s *Server) mountShipmentRoutes(r chi.Router) {
	r.Get("/shipments", s.handleListShipments)
	r.Post("/shipments", s.handleCreateShipment)
	r.Get("/shipments/{id}", s.handleGetShipment)
	r.Put("/shipments/{id}", s.handleUpdateShipment)
	r.Post("/shipments/{id}/calculate-tariff", s.handleCalculateTariff)
	r.Post("/shipments/{id}/send-to-payment", s.handleSendToPayment)
	r.Post("/shipments/{id}/generate-qr", s.handleGenerateQR)
	r.Post("/shipments/{id}/cancel", s.handleCancelShipment)
	r.Post("/shipments/{id}/hold", s.handleHoldShipment)
	r.Post("/shipments/{id}/request-correction", s.handleCorrectionRequest)
	r.Post("/shipments/{id}/damage-report", s.handleDamageReport)
	r.Get("/shipments/{id}/action-context", s.handleActionContext)
	r.Get("/shipments/by-station/{station}", s.handleShipmentsByStation)
}

func (s *Server) handleCreateShipment(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleOperator, model.RoleManager, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	var req struct {
		ClientID       string   `json:"client_id"`
		ClientName     string   `json:"client_name"`
		ClientEmail    string   `json:"client_email"`
		FromStation    string   `json:"from_station"`
		ToStation      string   `json:"to_station"`
		DepartureDate  string   `json:"departure_date"`
		Weight         string   `json:"weight"`
		Dimensions     string   `json:"dimensions"`
		Description    string   `json:"description"`
		Value          string   `json:"value"`
		Cost           float64  `json:"cost"`
		QuantityPlaces int      `json:"quantity_places"`
		ReceiverName   *string  `json:"receiver_name"`
		ReceiverPhone  *string  `json:"receiver_phone"`
		TrainTime      *string  `json:"train_time"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := s.requireStation(user, req.FromStation); err != nil {
		handleServiceError(w, err)
		return
	}
	departure := time.Now().UTC()
	if req.DepartureDate != "" {
		if parsed, err := time.Parse(time.RFC3339, req.DepartureDate); err == nil {
			departure = parsed
		}
	}
	shipment, err := s.services.Shipments.Create(r.Context(), service.CreateShipmentRequest{
		ClientID:       req.ClientID,
		ClientName:     req.ClientName,
		ClientEmail:    req.ClientEmail,
		FromStation:    req.FromStation,
		ToStation:      req.ToStation,
		DepartureDate:  departure,
		Weight:         req.Weight,
		Dimensions:     req.Dimensions,
		Description:    req.Description,
		Value:          req.Value,
		Cost:           req.Cost,
		QuantityPlaces: req.QuantityPlaces,
		ReceiverName:   req.ReceiverName,
		ReceiverPhone:  req.ReceiverPhone,
		TrainTime:      req.TrainTime,
		CreatedBy:      &user.ID,
	})
	if err != nil {
		handleServiceError(w, err)
		return
	}
	s.socket.BroadcastToRoom("/", "station:"+shipment.FromStation, "new-shipment", shipment)
	writeJSON(w, http.StatusOK, shipment)
}

func (s *Server) handleGetShipment(w http.ResponseWriter, r *http.Request) {
	shipment, err := s.services.Shipments.Get(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipment)
}

func (s *Server) handleListShipments(w http.ResponseWriter, r *http.Request) {
	shipments, err := s.services.Shipments.List(r.Context(), model.ShipmentFilter{
		Type:     r.URL.Query().Get("type"),
		Station:  r.URL.Query().Get("station"),
		ClientID: r.URL.Query().Get("client_id"),
		Query:    r.URL.Query().Get("q"),
	})
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipments)
}

func (s *Server) handleShipmentsByStation(w http.ResponseWriter, r *http.Request) {
	shipments, err := s.services.Shipments.List(r.Context(), model.ShipmentFilter{
		Type:    "by-station",
		Station: chi.URLParam(r, "station"),
	})
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipments)
}

func (s *Server) handleUpdateShipment(w http.ResponseWriter, r *http.Request) {
	current, err := s.services.Shipments.Get(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	if !decodeJSON(w, r, &current) {
		return
	}
	current.ID = chi.URLParam(r, "id")
	shipment, err := s.services.Shipments.Edit(r.Context(), current)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipment)
}

func (s *Server) handleCalculateTariff(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleOperator, model.RoleManager, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	current, err := s.services.Shipments.Get(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	if err := s.requireStation(user, current.FromStation); err != nil {
		handleServiceError(w, err)
		return
	}
	shipment, err := s.services.Shipments.CalculateTariff(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipment)
}

func (s *Server) handleSendToPayment(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleOperator, model.RoleManager, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	current, err := s.services.Shipments.Get(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	if err := s.requireStation(user, current.FromStation); err != nil {
		handleServiceError(w, err)
		return
	}
	shipment, err := s.services.Shipments.SendToPayment(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipment)
}

func (s *Server) handleGenerateQR(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleOperator, model.RoleManager, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	current, err := s.services.Shipments.Get(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	if err := s.requireStation(user, current.FromStation); err != nil {
		handleServiceError(w, err)
		return
	}
	log.Printf("generate_qr shipment_id=%s", chi.URLParam(r, "id"))
	code, shipment, err := s.services.Tracking.GenerateQRCode(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		log.Printf("generate_qr_failed shipment_id=%s error=%v", chi.URLParam(r, "id"), err)
		handleServiceError(w, err)
		return
	}
	log.Printf("generate_qr_success shipment_id=%s qr_code_id=%s tracking_code=%s", shipment.ID, code.ID, code.QRValue)
	writeJSON(w, http.StatusOK, map[string]any{"qr_code": code, "shipment": shipment})
}

func (s *Server) handleCancelShipment(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleOperator, model.RoleManager, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	var req struct{ Reason *string `json:"reason"` }
	if !decodeJSON(w, r, &req) {
		return
	}
	current, err := s.services.Shipments.Get(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	if err := s.requireStation(user, current.FromStation); err != nil {
		handleServiceError(w, err)
		return
	}
	shipment, err := s.services.Shipments.Cancel(r.Context(), chi.URLParam(r, "id"), &user.ID, &user.Name, req.Reason)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipment)
}

func (s *Server) handleHoldShipment(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleAdmin, model.RoleManager); err != nil {
		handleServiceError(w, err)
		return
	}
	var req struct{ Reason *string `json:"reason"` }
	if !decodeJSON(w, r, &req) {
		return
	}
	shipment, err := s.services.Shipments.Hold(r.Context(), chi.URLParam(r, "id"), &user.ID, &user.Name, req.Reason)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipment)
}

func (s *Server) handleCorrectionRequest(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	var req struct {
		ClientName     *string  `json:"client_name"`
		ClientEmail    *string  `json:"client_email"`
		FromStation    *string  `json:"from_station"`
		ToStation      *string  `json:"to_station"`
		Weight         *string  `json:"weight"`
		Dimensions     *string  `json:"dimensions"`
		Description    *string  `json:"description"`
		Value          *string  `json:"value"`
		Cost           *float64 `json:"cost"`
		QuantityPlaces *int     `json:"quantity_places"`
		ReceiverName   *string  `json:"receiver_name"`
		ReceiverPhone  *string  `json:"receiver_phone"`
		Reason         string   `json:"reason"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	shipment, err := s.services.Shipments.CorrectAfterPayment(r.Context(), chi.URLParam(r, "id"), &user.ID, &user.Name, service.CorrectionRequest{
		ClientName:     req.ClientName,
		ClientEmail:    req.ClientEmail,
		FromStation:    req.FromStation,
		ToStation:      req.ToStation,
		Weight:         req.Weight,
		Dimensions:     req.Dimensions,
		Description:    req.Description,
		Value:          req.Value,
		Cost:           req.Cost,
		QuantityPlaces: req.QuantityPlaces,
		ReceiverName:   req.ReceiverName,
		ReceiverPhone:  req.ReceiverPhone,
		Reason:         req.Reason,
	})
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipment)
}

func (s *Server) handleDamageReport(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleAdmin, model.RoleManager, model.RoleTransit, model.RoleLoading, model.RoleReceiver, model.RoleIssue); err != nil {
		handleServiceError(w, err)
		return
	}
	var req struct{ Reason *string `json:"reason"` }
	if !decodeJSON(w, r, &req) {
		return
	}
	shipment, err := s.services.Shipments.Damage(r.Context(), chi.URLParam(r, "id"), &user.ID, &user.Name, req.Reason)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipment)
}

func (s *Server) handleActionContext(w http.ResponseWriter, r *http.Request) {
	ctx, err := s.services.Shipments.ActionContext(r.Context(), chi.URLParam(r, "id"), s.authenticatedUser(r))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ctx)
}
