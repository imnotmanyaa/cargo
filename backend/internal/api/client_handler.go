package api

import (
	"net/http"

	"cargo/backend/internal/model"

	"github.com/go-chi/chi/v5"
)

func (s *Server) mountClientRoutes(r chi.Router) {
	r.Get("/clients", s.handleListCorporateClients)
	r.Get("/clients/{id}", s.handleGetClient)
	r.Post("/clients", s.handleCreateCorporateClient)
	r.Put("/clients/{id}", s.handleUpdateCorporateClient)
	r.Delete("/clients/{id}", s.handleDeleteCorporateClient)
}

func (s *Server) handleListCorporateClients(w http.ResponseWriter, r *http.Request) {
	users, err := s.services.Clients.ListCorporateClients(r.Context())
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, users)
}

func (s *Server) handleCreateCorporateClient(w http.ResponseWriter, r *http.Request) {
	authUser, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(authUser, model.RoleOperator, model.RoleManager, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	var req struct {
		Name     string  `json:"name"`
		Email    string  `json:"email"`
		Password string  `json:"password"`
		Company  string  `json:"company"`
		BIN      string  `json:"bin"`
		Phone    *string `json:"phone"`
		Deposit  float64 `json:"deposit"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	createdUser, err := s.services.Clients.CreateCorporateClient(r.Context(), req.Name, req.Email, req.Password, req.Company, req.BIN, req.Phone, req.Deposit)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"message": "Client created successfully", "clientId": createdUser.ID})
}

func (s *Server) handleGetClient(w http.ResponseWriter, r *http.Request) {
	user, err := s.services.Auth.Me(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (s *Server) handleUpdateCorporateClient(w http.ResponseWriter, r *http.Request) {
	authUser, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(authUser, model.RoleOperator, model.RoleManager, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	var req struct {
		Name     string  `json:"name"`
		Company  string  `json:"company"`
		BIN      string  `json:"bin"`
		Phone    *string `json:"phone"`
		Deposit  float64 `json:"deposit"`
		IsActive *bool   `json:"is_active,omitempty"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	updatedUser, err := s.services.Clients.UpdateCorporateClient(r.Context(), chi.URLParam(r, "id"), req.Name, req.Company, req.BIN, req.Phone, req.Deposit, req.IsActive)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"message": "Client updated successfully", "client": updatedUser})
}

func (s *Server) handleDeleteCorporateClient(w http.ResponseWriter, r *http.Request) {
	authUser, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(authUser, model.RoleOperator, model.RoleManager, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	err := s.services.Clients.DeleteCorporateClient(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "Client deleted successfully"})
}
