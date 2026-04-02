package api

import (
	"net/http"

	"cargo/backend/internal/model"

	"github.com/go-chi/chi/v5"
)

func (s *Server) mountPaymentRoutes(r chi.Router) {
	r.Post("/payments", s.handleCreatePayment)
	r.Get("/payments/{id}", s.handleGetPayment)
	r.Post("/payments/{id}/confirm", s.handleConfirmPayment)
	r.Post("/payments/topup", s.handleTopUp)
}

func (s *Server) handleCreatePayment(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleOperator, model.RoleManager, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	var req struct {
		ShipmentID   string  `json:"shipment_id"`
		Amount       float64 `json:"amount"`
		Method       string  `json:"payment_method"`
		POSReference *string `json:"pos_terminal_reference"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	shipment, err := s.services.Shipments.Get(r.Context(), req.ShipmentID)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	if err := s.requireStation(user, shipment.FromStation); err != nil {
		handleServiceError(w, err)
		return
	}
	payment, err := s.services.Payments.Create(r.Context(), req.ShipmentID, req.Amount, req.Method, req.POSReference)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, payment)
}

func (s *Server) handleGetPayment(w http.ResponseWriter, r *http.Request) {
	payment, err := s.services.Payments.Get(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, payment)
}

func (s *Server) handleConfirmPayment(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleAccounting, model.RoleManager, model.RoleAdmin, model.RoleOperator); err != nil {
		handleServiceError(w, err)
		return
	}
	payment, err := s.services.Payments.Get(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	shipment, err := s.services.Shipments.Get(r.Context(), payment.ShipmentID)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	if err := s.requireStation(user, shipment.FromStation); err != nil {
		handleServiceError(w, err)
		return
	}
	payment, shipment, err = s.services.Payments.Confirm(r.Context(), chi.URLParam(r, "id"), user.ID)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"payment": payment, "shipment": shipment})
}

func (s *Server) handleTopUp(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID string  `json:"userId"`
		Amount float64 `json:"amount"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	balance, err := s.services.Clients.TopUp(r.Context(), req.UserID, req.Amount)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"message": "Top up successful", "newBalance": balance})
}
