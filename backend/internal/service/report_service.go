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

func (s *ReportService) DashboardByStation(ctx context.Context, station string) (model.DashboardReport, error) {
	shipments, err := s.repo.ListShipmentsByOriginStation(ctx, station)
	if err != nil {
		return model.DashboardReport{}, err
	}
	report := model.DashboardReport{}
	revenueByRoute := map[string]*model.RouteRevenue{}
	for _, shipment := range shipments {
		report.MonthlyShipments++
		if shipment.ShipmentStatus == model.ShipmentIssued || shipment.ShipmentStatus == model.ShipmentClosed {
			report.CompletedShipments++
		} else {
			report.ActiveContracts++
		}
		route := shipment.FromStation + " -> " + shipment.ToStation
		item, ok := revenueByRoute[route]
		if !ok {
			item = &model.RouteRevenue{Route: route}
			revenueByRoute[route] = item
		}
		item.Revenue += shipment.Cost
		item.Count++
	}
	for _, item := range revenueByRoute {
		report.RevenueByRoute = append(report.RevenueByRoute, *item)
	}
	return report, nil
}

func (s *ReportService) StatusSummaryByStation(ctx context.Context, station string) ([]model.StatusSummaryItem, error) {
	shipments, err := s.repo.ListShipmentsByOriginStation(ctx, station)
	if err != nil {
		return nil, err
	}
	counts := map[string]int{}
	for _, shipment := range shipments {
		counts[string(shipment.ShipmentStatus)]++
	}
	var items []model.StatusSummaryItem
	for status, count := range counts {
		items = append(items, model.StatusSummaryItem{Status: status, Count: count})
	}
	return items, nil
}
