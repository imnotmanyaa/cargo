package service

import (
	"context"
	"testing"
	"cargo/backend/internal/model"
)

type MockRepoForIntegration struct {
	Repository
	users map[string]model.User
}

func (m *MockRepoForIntegration) GetUserByID(ctx context.Context, id string) (model.User, error) {
	if u, ok := m.users[id]; ok {
		return u, nil
	}
	return model.User{}, nil
}

func (m *MockRepoForIntegration) CreateShipment(ctx context.Context, s model.Shipment) (model.Shipment, error) {
	return s, nil
}

func (m *MockRepoForIntegration) AddShipmentHistory(ctx context.Context, h model.ShipmentHistory) error {
	return nil
}

func (m *MockRepoForIntegration) AddAuditLog(ctx context.Context, l model.AuditLog) error {
	return nil
}

func TestShipmentCreationScenarios(t *testing.T) {
	repo := &MockRepoForIntegration{
		users: map[string]model.User{
			"user-ind": {ID: "user-ind", Role: model.RoleIndividual},
			"user-corp": {ID: "user-corp", Role: model.RoleCorporate},
		},
	}
	svc := &ShipmentService{repo: repo}

	ctx := context.Background()

	tests := []struct {
		name     string
		req      CreateShipmentRequest
		expected float64
	}{
		{
			name: "Individual D2D Surcharge",
			req: CreateShipmentRequest{
				ClientID: "user-ind",
				ClientName: "Test Individual",
				FromStation: "Алматы-1",
				ToStation: "Астана Нұрлы Жол",
				Weight: "10",
				QuantityPlaces: 1,
				IsDoorToDoor: true,
			},
			expected: 10976,
		},
		{
			name: "Corporate D2D No Surcharge",
			req: CreateShipmentRequest{
				ClientID: "user-corp",
				ClientName: "Test Corporate",
				FromStation: "Алматы-1",
				ToStation: "Астана Нұрлы Жол",
				Weight: "10",
				QuantityPlaces: 1,
				IsDoorToDoor: true,
			},
			expected: 976,
		},
		{
			name: "Manager creating D2D for unknown client (treat as individual)",
			req: CreateShipmentRequest{
				ClientID: "unknown",
				ClientName: "Test Guest",
				ClientRole: "individual",
				FromStation: "Алматы-1",
				ToStation: "Астана Нұрлы Жол",
				Weight: "10",
				QuantityPlaces: 1,
				IsDoorToDoor: true,
			},
			expected: 10976,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s, err := svc.Create(ctx, tt.req)
			if err != nil {
				t.Fatalf("Create() error = %v", err)
			}
			if s.Cost != tt.expected {
				t.Errorf("Shipment.Cost = %v, want %v", s.Cost, tt.expected)
			}
		})
	}
}
