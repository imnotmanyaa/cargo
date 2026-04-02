package service

import (
	"context"

	"cargo/backend/internal/model"
)

func (s *ReferenceService) ListRoles(ctx context.Context) ([]model.RoleRecord, error) {
	return s.repo.ListRoles(ctx)
}

func (s *ReferenceService) ListStations(ctx context.Context) ([]model.Station, error) {
	return s.repo.ListStations(ctx)
}

func (s *ReferenceService) CreateStation(ctx context.Context, station model.Station) (model.Station, error) {
	return s.repo.CreateStation(ctx, station)
}

func (s *ReferenceService) UpdateStation(ctx context.Context, station model.Station) (model.Station, error) {
	return s.repo.UpdateStation(ctx, station)
}
