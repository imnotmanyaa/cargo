package api

import (
	"context"
	"encoding/json"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

func (s *Server) handleResetAdminPassword(w http.ResponseWriter, r *http.Request) {
	dbURL := os.Getenv("DATABASE_URL")
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer pool.Close()

	newPassword := "Admin1234"
	hash, _ := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	pool.Exec(context.Background(), `UPDATE users SET password_hash = $1 WHERE login = 'admin'`, string(hash))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"login":    "admin",
		"password": newPassword,
	})
}
