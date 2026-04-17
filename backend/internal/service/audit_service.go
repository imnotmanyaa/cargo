package service

import (
	"context"

	"cargo/backend/internal/model"
)

func (s *AuditService) List(ctx context.Context) ([]model.AuditLog, error) {
	return s.repo.ListAuditLogs(ctx)
}

func (s *AuditService) ListByUser(ctx context.Context, userID string) ([]model.AuditLog, error) {
	return s.repo.ListAuditLogsByUser(ctx, userID)
}
