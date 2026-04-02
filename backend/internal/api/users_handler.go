package api

import (
	"net/http"

	"cargo/backend/internal/model"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func (s *Server) mountUserRoutes(r chi.Router) {
	r.Get("/users", s.handleListUsers)
	r.Post("/users", s.handleCreateUser)
	r.Put("/users/{id}", s.handleUpdateUser)
	r.Get("/admin/employees", s.handleListEmployees)
	r.Post("/admin/employees", s.handleCreateEmployee)
	r.Delete("/admin/employees/{id}", s.handleDeleteEmployee)
}

func (s *Server) handleListUsers(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	users, err := s.services.Admin.ListUsers(r.Context())
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, users)
}

func (s *Server) handleCreateUser(w http.ResponseWriter, r *http.Request) {
	authUser, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(authUser, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	var req struct {
		Name     string  `json:"name"`
		Email    string  `json:"email"`
		Password string  `json:"password"`
		Role     string  `json:"role"`
		Station  *string `json:"station"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	createdUser, err := s.services.Admin.CreateEmployee(r.Context(), req.Name, req.Email, req.Password, model.Role(req.Role), req.Station)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, createdUser)
}

func (s *Server) handleUpdateUser(w http.ResponseWriter, r *http.Request) {
	authUser, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(authUser, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	var req model.User
	if !decodeJSON(w, r, &req) {
		return
	}
	req.ID = chi.URLParam(r, "id")
	if req.ID == "" {
		req.ID = uuid.NewString()
	}
	updatedUser, err := s.services.Admin.UpdateUser(r.Context(), req)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, updatedUser)
}

func (s *Server) handleListEmployees(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	users, err := s.services.Admin.ListEmployees(r.Context())
	if err != nil {
		handleServiceError(w, err)
		return
	}
	type employeeResponse struct {
		model.User
		Status string `json:"status"`
	}
	var response []employeeResponse
	for _, user := range users {
		response = append(response, employeeResponse{User: user, Status: "active"})
	}
	writeJSON(w, http.StatusOK, response)
}

func (s *Server) handleCreateEmployee(w http.ResponseWriter, r *http.Request) {
	authUser, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(authUser, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	var req struct {
		Name     string  `json:"name"`
		Email    string  `json:"email"`
		Password string  `json:"password"`
		Role     string  `json:"role"`
		Station  *string `json:"station"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	createdUser, err := s.services.Admin.CreateEmployee(r.Context(), req.Name, req.Email, req.Password, model.Role(req.Role), req.Station)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id":         createdUser.ID,
		"name":       createdUser.Name,
		"email":      createdUser.Email,
		"role":       createdUser.Role,
		"station":    createdUser.Station,
		"created_at": createdUser.CreatedAt,
		"status":     "active",
	})
}

func (s *Server) handleDeleteEmployee(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	if err := s.services.Admin.DeleteEmployee(r.Context(), chi.URLParam(r, "id")); err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "Employee deleted"})
}
