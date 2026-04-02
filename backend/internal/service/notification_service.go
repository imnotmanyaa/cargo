package service

import (
	"context"

	"cargo/backend/internal/model"
)

func (s *NotificationService) List(ctx context.Context, userID string) ([]model.Notification, error) {
	return s.repo.ListNotifications(ctx, userID)
}

func (s *NotificationService) MarkRead(ctx context.Context, id int64) error {
	return s.repo.MarkNotificationRead(ctx, id)
}
