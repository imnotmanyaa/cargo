package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"cargo/backend/internal/model"
	"cargo/backend/internal/service"
)

// MockRepo implements service.Repository
type MockRepo struct {
	service.Repository
	users map[string]model.User
}

func (m *MockRepo) GetUserByID(ctx context.Context, id string) (model.User, error) {
	if u, ok := m.users[id]; ok {
		return u, nil
	}
	return model.User{}, fmt.Errorf("not found")
}

func (m *MockRepo) CreateShipment(ctx context.Context, s model.Shipment) (model.Shipment, error) {
	return s, nil
}

func (m *MockRepo) AddShipmentHistory(ctx context.Context, h model.ShipmentHistory) error {
	return nil
}

func main() {
	repo := &MockRepo{
		users: map[string]model.User{
			"user-ind": {ID: "user-ind", Role: model.RoleIndividual},
			"user-corp": {ID: "user-corp", Role: model.RoleCorporate},
			"user-manager": {ID: "user-manager", Role: model.RoleManager},
		},
	}
	svc := service.NewServices(repo, "secret").Shipments

	ctx := context.Background()

	scenarios := []struct {
		name     string
		req      service.CreateShipmentRequest
		expected float64
	}{
		{
			name: "Individual creating D2D",
			req: service.CreateShipmentRequest{
				ClientID: "user-ind",
				FromStation: "Алматы-1",
				ToStation: "Астана Нұрлы Жол",
				Weight: "10",
				IsDoorToDoor: true,
			},
			expected: 10976,
		},
		{
			name: "Manager creating D2D for new individual (via ClientRole field)",
			req: service.CreateShipmentRequest{
				ClientID: "new-client-id", // Not in DB
				ClientRole: "individual",
				FromStation: "Алматы-1",
				ToStation: "Астана Нұрлы Жол",
				Weight: "10",
				IsDoorToDoor: true,
			},
			expected: 10976,
		},
		{
			name: "Manager creating D2D for Corporate client",
			req: service.CreateShipmentRequest{
				ClientID: "user-corp",
				ClientRole: "corporate",
				FromStation: "Алматы-1",
				ToStation: "Астана Нұрлы Жол",
				Weight: "10",
				IsDoorToDoor: true,
			},
			expected: 976,
		},
	}

	fmt.Println("Running Integration Scenarios...")
	for _, sc := range scenarios {
		s, err := svc.Create(ctx, sc.req)
		if err != nil {
			log.Fatalf("Failed %s: %v", sc.name, err)
		}
		if s.Cost != sc.expected {
			fmt.Printf("FAIL: %s | Got: %v, Want: %v\n", sc.name, s.Cost, sc.expected)
		} else {
			fmt.Printf("PASS: %s | Cost: %v\n", sc.name, s.Cost)
		}
	}
}
