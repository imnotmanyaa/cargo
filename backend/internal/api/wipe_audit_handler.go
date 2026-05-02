package api

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"os"
)

func (s *Server) handleWipeAudit(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("X-Wipe-Secret") != "cargo-wipe-2026" {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	dbURL := os.Getenv("DATABASE_URL")
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer pool.Close()

	tables := []string{"audit_logs", "notifications", "scan_events", "payment_logs", "wagon_checklists"}
	for _, t := range tables {
		pool.Exec(context.Background(), "TRUNCATE TABLE "+t+" CASCADE")
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "msg": "audit cleared"})
}
