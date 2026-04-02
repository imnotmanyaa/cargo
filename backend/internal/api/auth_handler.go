package api

import (
	"net/http"

	"cargo/backend/internal/model"

	"github.com/go-chi/chi/v5"
)

func (s *Server) mountAuthRoutes(r chi.Router) {
	r.Post("/auth/login", s.handleLogin)
	r.Post("/auth/register", s.handleRegister)
	r.With(s.requireAuth).Get("/auth/me", s.handleMe)
	r.Post("/auth/logout", s.handleLogout)
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name     string  `json:"name"`
		Email    string  `json:"email"`
		Password string  `json:"password"`
		Role     string  `json:"role"`
		Company  *string `json:"company"`
		Phone    *string `json:"phone"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	user, token, err := s.services.Auth.Register(r.Context(), req.Name, req.Email, req.Password, model.Role(req.Role), req.Company, req.Phone)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, withToken(user, token))
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	user, token, err := s.services.Auth.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, withToken(user, token))
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	user := s.authenticatedUser(r)
	if user == nil {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return
	}
	record, err := s.services.Auth.Me(r.Context(), user.ID)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, withToken(record, ""))
}

func (s *Server) handleLogout(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}
