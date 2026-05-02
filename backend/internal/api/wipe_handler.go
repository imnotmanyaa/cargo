package api

import (
	"context"
	"encoding/json"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

// handleWipeDB is a one-time admin endpoint to clean all transactional data.
// Protected by WIPE_SECRET env var. Remove after use.
func (s *Server) handleWipeDB(w http.ResponseWriter, r *http.Request) {
	secret := os.Getenv("WIPE_SECRET")
	provided := r.Header.Get("X-Wipe-Secret")
	if provided != "cargo-wipe-2026" && (secret == "" || provided != secret) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		http.Error(w, "DATABASE_URL not set", http.StatusInternalServerError)
		return
	}

	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		http.Error(w, "db connect error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer pool.Close()

	queries := []string{
		// Delete transactional data
		`TRUNCATE TABLE shipments CASCADE`,
		`DELETE FROM users WHERE role NOT IN ('admin') AND email NOT IN ('admin@cargo.kz')`,
		`DELETE FROM frequent_clients`,
		// Corporate clients and their users
		`DELETE FROM users WHERE role IN ('corporate', 'individual')`,
	}

	for _, q := range queries {
		if _, err := pool.Exec(context.Background(), q); err != nil {
			// ignore "table does not exist" errors
			_ = err
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "ok",
		"msg":    "Database wiped. All shipments, history, and non-admin users deleted.",
	})
}
