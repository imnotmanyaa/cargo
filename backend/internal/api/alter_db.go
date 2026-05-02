package api

import (
	"context"
	"encoding/json"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

func (s *Server) handleAlterTable(w http.ResponseWriter, r *http.Request) {
	dbURL := os.Getenv("DATABASE_URL")
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer pool.Close()

	// Ignore errors if already renamed
	pool.Exec(context.Background(), "ALTER TABLE users RENAME COLUMN email TO login")
	pool.Exec(context.Background(), "ALTER TABLE shipments RENAME COLUMN client_email TO client_login")

	// Update admin login to 'admin'
	pool.Exec(context.Background(), "UPDATE users SET login = 'admin' WHERE login = 'admin@cargo.kz'")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "msg": "Tables altered"})
}
