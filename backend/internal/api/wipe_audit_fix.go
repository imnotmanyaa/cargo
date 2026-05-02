package api

import (
	"context"
	"encoding/json"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

func (s *Server) handleWipeAuditLogFix(w http.ResponseWriter, r *http.Request) {
	dbURL := os.Getenv("DATABASE_URL")
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer pool.Close()

	pool.Exec(context.Background(), "TRUNCATE TABLE audit_log CASCADE")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "msg": "audit_log cleared"})
}
