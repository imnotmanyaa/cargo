package service

import (
	"context"

	"cargo/backend/internal/model"
)

func (s *AuditService) List(ctx context.Context) ([]model.AuditLog, error) {
	return s.repo.ListAuditLogs(ctx)
}
