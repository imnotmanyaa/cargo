package api

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"cargo/backend/internal/config"
	"cargo/backend/internal/model"
	"cargo/backend/internal/service"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	socketio "github.com/googollee/go-socket.io"
)

type contextKey string

const userContextKey contextKey = "user"

type Server struct {
	cfg      config.Config
	services service.Services
	router   chi.Router
	socket   *socketio.Server
}

func NewServer(cfg config.Config, services service.Services) (*Server, error) {
	socket := socketio.NewServer(nil)
	s := &Server{
		cfg:      cfg,
		services: services,
		socket:   socket,
	}
	s.setupSocket()
	s.router = s.routes()
	return s, nil
}

func (s *Server) Router() http.Handler {
	return s.router
}

func (s *Server) routes() chi.Router {
	r := chi.NewRouter()
	r.Use(s.requestLogger)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "X-User-ID", "X-User-Role", "X-User-Station"},
	}))

	r.Get("/health", s.handleHealth)
	r.Handle("/socket.io/", s.socket)
	r.Handle("/socket.io/*", s.socket)

	r.Route("/api", func(api chi.Router) {
		s.mountAuthRoutes(api)
		s.mountUserRoutes(api)
		s.mountReferenceRoutes(api)
		s.mountClientRoutes(api)
		s.mountShipmentRoutes(api)
		s.mountPaymentRoutes(api)
		s.mountTrackingRoutes(api)
		s.mountTransitRoutes(api)
		s.mountArrivalRoutes(api)
		s.mountLifecycleRoutes(api)
		s.mountNotificationRoutes(api)
		s.mountAuditRoutes(api)
		s.mountReportRoutes(api)
	})
	return r
}

func (s *Server) requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := &statusWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(ww, r)
		log.Printf("http %s %s status=%d duration=%s", r.Method, r.URL.Path, ww.status, time.Since(start))
	})
}

func (s *Server) setupSocket() {
	s.socket.OnConnect("/", func(conn socketio.Conn) error { return nil })
	s.socket.OnEvent("/", "join-station", func(conn socketio.Conn, station string) {
		conn.Join("station:" + station)
	})
	s.socket.OnEvent("/", "join-user", func(conn socketio.Conn, userID string) {
		conn.Join("user:" + userID)
	})
	s.socket.OnError("/", func(_ socketio.Conn, _ error) {})
}

func (s *Server) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			writeError(w, http.StatusUnauthorized, "Authentication required")
			return
		}
		user, err := s.services.Auth.ParseToken(strings.TrimPrefix(authHeader, "Bearer "))
		if err != nil {
			writeError(w, http.StatusUnauthorized, "Invalid token")
			return
		}
		ctx := context.WithValue(r.Context(), userContextKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (s *Server) authenticatedUser(r *http.Request) *service.AuthenticatedUser {
	if user, ok := r.Context().Value(userContextKey).(service.AuthenticatedUser); ok {
		return &user
	}
	if authHeader := r.Header.Get("Authorization"); strings.HasPrefix(authHeader, "Bearer ") {
		user, err := s.services.Auth.ParseToken(strings.TrimPrefix(authHeader, "Bearer "))
		if err == nil {
			return &user
		}
	}
	if id := r.Header.Get("X-User-ID"); id != "" {
		return &service.AuthenticatedUser{
			ID:      id,
			Role:    model.Role(r.Header.Get("X-User-Role")),
			Station: r.Header.Get("X-User-Station"),
		}
	}
	return nil
}

func handleServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrInvalidCredentials):
		writeError(w, http.StatusBadRequest, "Invalid credentials")
	case errors.Is(err, service.ErrDuplicateEmail):
		writeError(w, http.StatusBadRequest, "User already exists")
	case errors.Is(err, service.ErrNotFound):
		writeError(w, http.StatusNotFound, "Not found")
	case errors.Is(err, service.ErrInvalidTransition):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, service.ErrInvalidState):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, service.ErrValidation):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, service.ErrForbidden):
		writeError(w, http.StatusForbidden, "Forbidden")
	case errors.Is(err, service.ErrUnauthorized):
		writeError(w, http.StatusUnauthorized, "Authentication required")
	default:
		writeError(w, http.StatusInternalServerError, "Internal server error")
	}
}

func (s *Server) mustAuth(w http.ResponseWriter, r *http.Request) (*service.AuthenticatedUser, bool) {
	authHeader := r.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		writeError(w, http.StatusUnauthorized, "Authentication required")
		return nil, false
	}
	user, err := s.services.Auth.ParseToken(strings.TrimPrefix(authHeader, "Bearer "))
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Invalid token")
		return nil, false
	}
	return &user, true
}

func (s *Server) requireRole(user *service.AuthenticatedUser, roles ...model.Role) error {
	for _, role := range roles {
		if user.Role == role {
			return nil
		}
	}
	return service.ErrForbidden
}

func (s *Server) requireStation(user *service.AuthenticatedUser, station string) error {
	if user.Role == model.RoleAdmin || user.Role == model.RoleManager {
		return nil
	}
	if user.Station == "" || user.Station != station {
		return service.ErrForbidden
	}
	return nil
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(status int) {
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	defer r.Body.Close()
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON payload")
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func withToken(user model.User, token string) map[string]any {
	response := map[string]any{
		"id":              user.ID,
		"name":            user.Name,
		"email":           user.Email,
		"role":            user.Role,
		"company":         user.Company,
		"deposit_balance": user.DepositBalance,
		"contract_number": user.ContractNumber,
		"phone":           user.Phone,
		"station":         user.Station,
		"is_active":       user.IsActive,
	}
	if token != "" {
		response["token"] = token
	}
	return response
}
