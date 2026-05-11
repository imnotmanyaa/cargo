package api

import (
	"fmt"
	"net/http"

	"cargo/backend/internal/model"
)

// handleAdminCleanup — очистка всех данных кроме сотрудников.
// POST /api/admin/cleanup
func (s *Server) handleAdminCleanup(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	if s.pool == nil {
		writeError(w, http.StatusInternalServerError, "Database pool not available")
		return
	}

	ctx := r.Context()
	results := []map[string]any{}

	queries := []struct {
		desc string
		sql  string
	}{
		{"scan_events", "DELETE FROM scan_events"},
		{"transit_events", "DELETE FROM transit_events"},
		{"arrival_events", "DELETE FROM arrival_events"},
		{"shipment_history", "DELETE FROM shipment_history"},
		{"payments", "DELETE FROM payments"},
		{"notifications", "DELETE FROM notifications"},
		{"qr_codes", "DELETE FROM qr_codes"},
		{"audit_log", "DELETE FROM audit_log"},
		{"shipments", "DELETE FROM shipments"},
		{"clients (individual+corporate)", "DELETE FROM users WHERE role IN ('individual', 'corporate')"},
	}

	for _, q := range queries {
		tag, err := s.pool.Exec(ctx, q.sql)
		if err != nil {
			results = append(results, map[string]any{"table": q.desc, "error": err.Error()})
		} else {
			results = append(results, map[string]any{"table": q.desc, "deleted": tag.RowsAffected()})
		}
	}

	var staffCount int
	_ = s.pool.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&staffCount)

	writeJSON(w, http.StatusOK, map[string]any{
		"message":      "Очистка завершена",
		"staff_remaining": staffCount,
		"details":      results,
		"cleaned_by":   fmt.Sprintf("%s (%s)", user.Name, user.Role),
	})
}

// handleAdminForceCleanup — очистка без авторизации (по секретному ключу)
func (s *Server) handleAdminForceCleanup(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("X-Cleanup-Secret") != "force-reset-2026" {
		writeError(w, http.StatusUnauthorized, "Invalid secret")
		return
	}
	if s.pool == nil {
		writeError(w, http.StatusInternalServerError, "Database pool not available")
		return
	}

	ctx := r.Context()
	results := []map[string]any{}
	queries := []struct {
		desc string
		sql  string
	}{
		{"scan_events", "DELETE FROM scan_events"},
		{"transit_events", "DELETE FROM transit_events"},
		{"arrival_events", "DELETE FROM arrival_events"},
		{"shipment_history", "DELETE FROM shipment_history"},
		{"payments", "DELETE FROM payments"},
		{"notifications", "DELETE FROM notifications"},
		{"qr_codes", "DELETE FROM qr_codes"},
		{"audit_log", "DELETE FROM audit_log"},
		{"shipments", "DELETE FROM shipments"},
		{"clients (individual+corporate)", "DELETE FROM users WHERE role IN ('individual', 'corporate')"},
	}

	for _, q := range queries {
		tag, err := s.pool.Exec(ctx, q.sql)
		if err != nil {
			results = append(results, map[string]any{"table": q.desc, "error": err.Error()})
		} else {
			results = append(results, map[string]any{"table": q.desc, "deleted": tag.RowsAffected()})
		}
	}

	var staffCount int
	_ = s.pool.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&staffCount)

	writeJSON(w, http.StatusOK, map[string]any{
		"message":      "Принудительная очистка завершена",
		"staff_remaining": staffCount,
		"details":      results,
	})
}
