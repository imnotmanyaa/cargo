package api

import (
	"net/http"
	"strings"

	"cargo/backend/internal/model"

	"github.com/go-chi/chi/v5"
)

func (s *Server) mountAuthRoutes(r chi.Router) {
	r.Post("/auth/login", s.handleLogin)
	r.Post("/auth/courier/login", s.handleCourierLogin)
	r.Post("/auth/register", s.handleRegister)
	r.Post("/auth/qr-login", s.handleQRLogin)
	r.With(s.requireAuth).Get("/auth/me", s.handleMe)
	r.Post("/auth/logout", s.handleLogout)
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name     string  `json:"name"`
		Login    string  `json:"login"`
		Password string  `json:"password"`
		Role     string  `json:"role"`
		Company  *string `json:"company"`
		Phone    *string `json:"phone"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	
	allowedRoles := map[string]bool{
		string(model.RoleIndividual): true,
		string(model.RoleCorporate):  true,
	}
	if !allowedRoles[req.Role] {
		req.Role = string(model.RoleIndividual) // Default to individual if invalid or attempted privilege escalation
	}

	user, token, err := s.services.Auth.Register(r.Context(), req.Name, req.Login, req.Password, model.Role(req.Role), req.Company, req.Phone)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, withToken(user, token))
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Login    string `json:"login"`
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	user, token, err := s.services.Auth.Login(r.Context(), req.Login, req.Password)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, withToken(user, token))
}

func (s *Server) handleCourierLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Login    string `json:"login"`
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	user, token, err := s.services.Auth.Login(r.Context(), req.Login, req.Password)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	if user.Role != model.RoleCourier {
		writeError(w, http.StatusForbidden, "Courier access only")
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

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		token := strings.TrimPrefix(authHeader, "Bearer ")
		s.services.Auth.Logout(token)
	}
	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}

func (s *Server) handleQRLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token string `json:"token"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	user, authToken, err := s.services.Auth.QRLogin(r.Context(), req.Token)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, withToken(user, authToken))
}
