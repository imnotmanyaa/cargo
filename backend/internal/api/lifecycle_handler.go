package api

import (
	"net/http"

	"cargo/backend/internal/model"
	"cargo/backend/internal/service"

	"github.com/go-chi/chi/v5"
)

func (s *Server) mountLifecycleRoutes(r chi.Router) {
	r.Post("/shipments/{id}/ready-for-loading", s.handleReadyForLoading)
	r.Post("/shipments/{id}/load", s.handleLoadShipment)
	r.Post("/shipments/{id}/dispatch", s.handleDispatchShipment)
	r.Post("/shipments/{id}/issue", s.handleIssueShipment)
	r.Post("/shipments/{id}/close", s.handleCloseShipment)
	r.Patch("/shipments/{id}/status", s.handleLegacyStatusPatch)
}

func (s *Server) handleReadyForLoading(w http.ResponseWriter, r *http.Request) {
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
	shipment, err := s.services.Shipments.ReadyForLoading(r.Context(), chi.URLParam(r, "id"), &user.ID, &user.Name)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipment)
}

func (s *Server) handleLoadShipment(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleLoading, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	var req struct {
		CurrentStation  *string `json:"current_station"`
		TransportUnitID *string `json:"transport_unit_id"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.CurrentStation == nil {
		req.CurrentStation = &user.Station
	}
	if err := s.requireStation(user, *req.CurrentStation); err != nil {
		handleServiceError(w, err)
		return
	}
	shipment, err := s.services.Shipments.Load(r.Context(), chi.URLParam(r, "id"), &user.ID, &user.Name, req.CurrentStation, req.TransportUnitID)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipment)
}

func (s *Server) handleDispatchShipment(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleLoading, model.RoleTransit, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	var req struct {
		CurrentStation *string `json:"current_station"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.CurrentStation == nil {
		req.CurrentStation = &user.Station
	}
	if err := s.requireStation(user, *req.CurrentStation); err != nil {
		handleServiceError(w, err)
		return
	}
	shipment, err := s.services.Shipments.Dispatch(r.Context(), chi.URLParam(r, "id"), &user.ID, &user.Name, req.CurrentStation)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipment)
}

func (s *Server) handleIssueShipment(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleIssue, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	var req struct {
		ReceiverName  string `json:"receiver_name"`
		ReceiverPhone string `json:"receiver_phone"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	current, err := s.services.Shipments.Get(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	if err := s.requireStation(user, current.ToStation); err != nil {
		handleServiceError(w, err)
		return
	}
	shipment, err := s.services.Shipments.IssueWithVerification(r.Context(), chi.URLParam(r, "id"), &user.ID, &user.Name, service.IssueRequest{
		ReceiverName:  req.ReceiverName,
		ReceiverPhone: req.ReceiverPhone,
	})
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipment)
}

func (s *Server) handleCloseShipment(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleIssue, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	current, err := s.services.Shipments.Get(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	if err := s.requireStation(user, current.ToStation); err != nil {
		handleServiceError(w, err)
		return
	}
	shipment, err := s.services.Shipments.Close(r.Context(), chi.URLParam(r, "id"), &user.ID, &user.Name)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipment)
}

func (s *Server) handleLegacyStatusPatch(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Status       string  `json:"status"`
		OperatorID   *string `json:"operator_id"`
		OperatorName *string `json:"operator_name"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	var shipment model.Shipment
	var err error
	switch req.Status {
	case "Погружен":
		shipment, err = s.services.Shipments.Load(r.Context(), chi.URLParam(r, "id"), req.OperatorID, req.OperatorName, nil, nil)
	case "В пути":
		shipment, err = s.services.Shipments.Dispatch(r.Context(), chi.URLParam(r, "id"), req.OperatorID, req.OperatorName, nil)
	case "Выдан":
		shipment, err = s.services.Shipments.Issue(r.Context(), chi.URLParam(r, "id"), req.OperatorID, req.OperatorName)
	case "Закрыт":
		shipment, err = s.services.Shipments.Close(r.Context(), chi.URLParam(r, "id"), req.OperatorID, req.OperatorName)
	default:
		writeError(w, http.StatusBadRequest, "Unsupported legacy status")
		return
	}
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipment)
}
