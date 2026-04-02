package service

import (
	"context"

	"cargo/backend/internal/model"
)

func (s *ReportService) Dashboard(ctx context.Context) (model.DashboardReport, error) {
	return s.repo.GetDashboardReport(ctx)
}

func (s *ReportService) Finance(ctx context.Context) (model.FinanceReport, error) {
	return s.repo.GetFinanceReport(ctx)
}

func (s *ReportService) StatusSummary(ctx context.Context) ([]model.StatusSummaryItem, error) {
	return s.repo.GetStatusSummary(ctx)
}
