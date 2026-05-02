package service

import (
	"context"
	"testing"
	"cargo/backend/internal/model"
)

type MockFullRepo struct {
	Repository
	shipment model.Shipment
	wagon    model.Wagon
	payments []model.Payment
	history  []model.ShipmentHistory
	scans    []model.ScanEvent
}

func (m *MockFullRepo) CreateShipment(ctx context.Context, s model.Shipment) (model.Shipment, error) {
	m.shipment = s
	return s, nil
}
func (m *MockFullRepo) GetShipmentByID(ctx context.Context, id string) (model.Shipment, error) {
	return m.shipment, nil
}
func (m *MockFullRepo) UpdateShipment(ctx context.Context, s model.Shipment) (model.Shipment, error) {
	m.shipment = s
	return s, nil
}
func (m *MockFullRepo) GetUserByID(ctx context.Context, id string) (model.User, error) {
	return model.User{ID: id, Role: model.RoleIndividual, Name: "Test User"}, nil
}
func (m *MockFullRepo) CreatePayment(ctx context.Context, p model.Payment) (model.Payment, error) {
	m.payments = append(m.payments, p)
	return p, nil
}
func (m *MockFullRepo) AddShipmentHistory(ctx context.Context, h model.ShipmentHistory) error {
	m.history = append(m.history, h)
	return nil
}
func (m *MockFullRepo) AddAuditLog(ctx context.Context, l model.AuditLog) error { return nil }

func (m *MockFullRepo) CreateWagon(ctx context.Context, w model.Wagon) (model.Wagon, error) {
	m.wagon = w
	return w, nil
}
func (m *MockFullRepo) GetWagonByID(ctx context.Context, id string) (model.Wagon, error) {
	return m.wagon, nil
}
func (m *MockFullRepo) UpdateWagon(ctx context.Context, w model.Wagon) (model.Wagon, error) {
	m.wagon = w
	return w, nil
}
func (m *MockFullRepo) AssignShipmentToWagon(ctx context.Context, wagonID, shipmentID string) error { return nil }
func (m *MockFullRepo) GetWagonShipments(ctx context.Context, wagonID string) ([]model.WagonShipment, error) {
	return []model.WagonShipment{{WagonID: wagonID, ShipmentID: m.shipment.ID}}, nil
}
func (m *MockFullRepo) UpdateWagonShipmentStatus(ctx context.Context, wagonID, shipmentID, status string) error { return nil }
func (m *MockFullRepo) CreateArrivalEvent(ctx context.Context, e model.ArrivalEvent) (model.ArrivalEvent, error) { return e, nil }
func (m *MockFullRepo) CreateNotification(ctx context.Context, n model.Notification) (model.Notification, error) { return n, nil }
func (m *MockFullRepo) CreateScanEvent(ctx context.Context, e model.ScanEvent) (model.ScanEvent, error) {
	m.scans = append(m.scans, e)
	return e, nil
}
func (m *MockFullRepo) ListScanEvents(ctx context.Context, id string) ([]model.ScanEvent, error) {
	return m.scans, nil
}

func TestFullLifecycle_AstanaToAlmaty(t *testing.T) {
	repo := &MockFullRepo{}
	svc := &ShipmentService{repo: repo}
	
	ctx := context.Background()
	destOperatorID := "op-2"
	opName := "Almaty Op"
	opStation := "Алматы-1"
	astanaStation := "Астана Нұрлы Жол"

	// 1. Создание (Астана -> Алматы)
	t.Log("Step 1: Creating shipment Astana -> Almaty")
	phone := "77777777777"
	receiverName := "Receiver One"
	shipment, err := svc.Create(ctx, CreateShipmentRequest{
		ClientID: "client-1",
		ClientName: "Client One",
		FromStation: astanaStation,
		ToStation: opStation,
		Weight: "10",
		QuantityPlaces: 1,
		IsDoorToDoor: true,
		ReceiverName: &receiverName,
		ReceiverPhone: &phone,
	})
	if err != nil {
		t.Fatalf("Failed to create: %v", err)
	}

	// 2. Оплата
	t.Log("Step 2: Payment")
	shipment.ShipmentStatus = model.ShipmentPaid
	repo.UpdateShipment(ctx, shipment)

	// 3. Подготовка к погрузке
	t.Log("Step 3: Ready for loading")
	shipment, err = svc.ReadyForLoading(ctx, shipment.ID, nil, nil)
	if err != nil {
		t.Fatalf("Failed ready: %v", err)
	}

	// 4. Погрузка
	t.Log("Step 4: Loading")
	wagonNo := "W-001"
	shipment, err = svc.Load(ctx, shipment.ID, nil, nil, &astanaStation, &wagonNo)
	if err != nil {
		t.Fatalf("Failed load: %v", err)
	}

	// 5. Отправление
	t.Log("Step 5: Dispatch")
	shipment, err = svc.Dispatch(ctx, shipment.ID, nil, nil, &astanaStation)
	if err != nil {
		t.Fatalf("Failed dispatch: %v", err)
	}

	// 6. Прибытие в Алматы
	t.Log("Step 6: Arrival at Almaty")
	_, _, err = svc.Arrive(ctx, shipment.ID, opStation, &destOperatorID, &opName)
	if err != nil {
		t.Fatalf("Failed arrival: %v", err)
	}

	// 7. Скан при выдаче (ISSUE_SCAN)
	t.Log("Step 7: Issue Scan")
	_, err = repo.CreateScanEvent(ctx, model.ScanEvent{
		ShipmentID: shipment.ID,
		EventType:  "ISSUE_SCAN",
		ScannedAt:  shipment.UpdatedAt,
	})

	// 8. Финальная выдача с верификацией
	t.Log("Step 8: Final Issue with Verification")
	_, err = svc.IssueWithVerification(ctx, shipment.ID, &destOperatorID, &opName, IssueRequest{
		ReceiverName:  receiverName,
		ReceiverPhone: phone,
	})
	if err != nil {
		t.Fatalf("Failed issue: %v", err)
	}
	
	finalShipment, _ := repo.GetShipmentByID(ctx, shipment.ID)
	if finalShipment.ShipmentStatus != model.ShipmentIssued {
		t.Errorf("Final status should be ISSUED, got: %v", finalShipment.ShipmentStatus)
	}
	
	t.Log("Lifecycle Test Astana -> Almaty: PASSED")
}
