package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"cargo/backend/internal/config"
	"cargo/backend/internal/model"
	"cargo/backend/internal/service"
)

func TestPilotLifecycleFlow(t *testing.T) {
	repo := newMemoryRepo()
	services := service.NewServices(repo, "test-secret")
	server, err := NewServer(config.Config{Port: "8080", JWTSecret: "test-secret"}, services)
	if err != nil {
		t.Fatalf("new server: %v", err)
	}

	registerResp := performJSON(t, server.Router(), "POST", "/api/auth/register", map[string]any{
		"name":     "Client",
		"email":    "client@test",
		"password": "secret123",
		"role":     "individual",
	}, "")
	if registerResp.Code != http.StatusOK {
		t.Fatalf("register failed: %d %s", registerResp.Code, registerResp.Body.String())
	}
	var user map[string]any
	decodeResponse(t, registerResp, &user)
	clientID := user["id"].(string)

	originStation := "Алматы-1"
	destStation := "Ақтөбе"
	operatorToken := createEmployeeAndLogin(t, server, services, "Origin Operator", "operator@test", "secret123", model.RoleOperator, &originStation)
	loadingToken := createEmployeeAndLogin(t, server, services, "Loader", "loader@test", "secret123", model.RoleLoading, &originStation)
	transitStation := "Қарағанды"
	transitToken := createEmployeeAndLogin(t, server, services, "Transit", "transit@test", "secret123", model.RoleTransit, &transitStation)
	receiverToken := createEmployeeAndLogin(t, server, services, "Receiver", "receiver@test", "secret123", model.RoleReceiver, &destStation)
	issueToken := createEmployeeAndLogin(t, server, services, "Issue", "issue@test", "secret123", model.RoleIssue, &destStation)
	receiverName := "Receiver Test"
	receiverPhone := "+77010000000"

	createResp := performJSON(t, server.Router(), "POST", "/api/shipments", map[string]any{
		"client_id":      clientID,
		"client_name":    "Client",
		"client_email":   "client@test",
		"from_station":   originStation,
		"to_station":     destStation,
		"departure_date": time.Now().UTC().Format(time.RFC3339),
		"weight":         "25",
		"dimensions":     "20x20x20",
		"description":    "Laptop",
		"value":          "150000",
		"cost":           7000,
		"quantity_places": 1,
		"receiver_name": receiverName,
		"receiver_phone": receiverPhone,
	}, operatorToken)
	var shipment model.Shipment
	decodeResponse(t, createResp, &shipment)
	if shipment.ShipmentStatus != model.ShipmentCreated {
		t.Fatalf("expected CREATED, got %s", shipment.ShipmentStatus)
	}

	calcResp := performJSON(t, server.Router(), "POST", "/api/shipments/"+shipment.ID+"/calculate-tariff", map[string]any{}, operatorToken)
	if calcResp.Code != http.StatusOK {
		t.Fatalf("calculate tariff failed: %d %s", calcResp.Code, calcResp.Body.String())
	}

	sendToPaymentResp := performJSON(t, server.Router(), "POST", "/api/shipments/"+shipment.ID+"/send-to-payment", map[string]any{}, operatorToken)
	decodeResponse(t, sendToPaymentResp, &shipment)
	if shipment.ShipmentStatus != model.ShipmentPaymentPending {
		t.Fatalf("expected PAYMENT_PENDING, got %s", shipment.ShipmentStatus)
	}

	paymentResp := performJSON(t, server.Router(), "POST", "/api/payments", map[string]any{
		"shipment_id":   shipment.ID,
		"amount":        5750,
		"payment_method": "POS",
	}, operatorToken)
	var payment model.Payment
	decodeResponse(t, paymentResp, &payment)

	confirmResp := performJSON(t, server.Router(), "POST", "/api/payments/"+payment.ID+"/confirm", map[string]any{}, operatorToken)
	if confirmResp.Code != http.StatusOK {
		t.Fatalf("confirm payment failed: %d %s", confirmResp.Code, confirmResp.Body.String())
	}

	qrResp := performJSON(t, server.Router(), "POST", "/api/shipments/"+shipment.ID+"/generate-qr", map[string]any{}, operatorToken)
	if qrResp.Code != http.StatusOK {
		t.Fatalf("generate qr failed: %d %s", qrResp.Code, qrResp.Body.String())
	}

	readyResp := performJSON(t, server.Router(), "POST", "/api/shipments/"+shipment.ID+"/ready-for-loading", map[string]any{}, operatorToken)
	if readyResp.Code != http.StatusBadRequest {
		t.Fatalf("expected bad request because already READY_FOR_LOADING, got %d", readyResp.Code)
	}

	loadResp := performJSON(t, server.Router(), "POST", "/api/shipments/"+shipment.ID+"/load", map[string]any{
		"current_station": originStation,
	}, loadingToken)
	decodeResponse(t, loadResp, &shipment)
	if shipment.ShipmentStatus != model.ShipmentLoaded {
		t.Fatalf("expected LOADED, got %s", shipment.ShipmentStatus)
	}

	dispatchResp := performJSON(t, server.Router(), "POST", "/api/shipments/"+shipment.ID+"/dispatch", map[string]any{
		"current_station": originStation,
	}, loadingToken)
	decodeResponse(t, dispatchResp, &shipment)
	if shipment.ShipmentStatus != model.ShipmentInTransit {
		t.Fatalf("expected IN_TRANSIT, got %s", shipment.ShipmentStatus)
	}

	transitResp := performJSON(t, server.Router(), "POST", "/api/shipments/"+shipment.ID+"/mark-transit", map[string]any{
		"current_station": transitStation,
	}, transitToken)
	if transitResp.Code != http.StatusOK {
		t.Fatalf("mark transit failed: %d %s", transitResp.Code, transitResp.Body.String())
	}

	arriveResp := performJSON(t, server.Router(), "POST", "/api/shipments/"+shipment.ID+"/arrive", map[string]any{
		"current_station": destStation,
	}, receiverToken)
	decodeResponse(t, arriveResp, &shipment)
	if shipment.ShipmentStatus != model.ShipmentArrived {
		t.Fatalf("expected ARRIVED, got %s", shipment.ShipmentStatus)
	}

	readyIssueResp := performJSON(t, server.Router(), "POST", "/api/shipments/"+shipment.ID+"/ready-for-issue", map[string]any{}, receiverToken)
	decodeResponse(t, readyIssueResp, &shipment)
	if shipment.ShipmentStatus != model.ShipmentReadyForIssue {
		t.Fatalf("expected READY_FOR_ISSUE, got %s", shipment.ShipmentStatus)
	}

	scanResp := performJSON(t, server.Router(), "POST", "/api/scan", map[string]any{
		"shipment_id": shipment.ID,
		"event_type": "ISSUE_SCAN",
		"station_id": destStation,
	}, issueToken)
	if scanResp.Code != http.StatusCreated {
		t.Fatalf("issue scan failed: %d %s", scanResp.Code, scanResp.Body.String())
	}

	issueResp := performJSON(t, server.Router(), "POST", "/api/shipments/"+shipment.ID+"/issue", map[string]any{
		"receiver_name": receiverName,
		"receiver_phone": receiverPhone,
	}, issueToken)
	decodeResponse(t, issueResp, &shipment)
	if shipment.ShipmentStatus != model.ShipmentIssued {
		t.Fatalf("expected ISSUED, got %s", shipment.ShipmentStatus)
	}

	closeResp := performJSON(t, server.Router(), "POST", "/api/shipments/"+shipment.ID+"/close", map[string]any{}, issueToken)
	decodeResponse(t, closeResp, &shipment)
	if shipment.ShipmentStatus != model.ShipmentClosed {
		t.Fatalf("expected CLOSED, got %s", shipment.ShipmentStatus)
	}
}

func TestTrackingAndReportsEndpoints(t *testing.T) {
	repo := newMemoryRepo()
	services := service.NewServices(repo, "test-secret")
	server, _ := NewServer(config.Config{Port: "8080", JWTSecret: "test-secret"}, services)
	accountingToken := createEmployeeAndLogin(t, server, services, "Accounting", "accounting@test", "secret123", model.RoleAccounting, nil)

	shipment, err := services.Shipments.Create(context.Background(), service.CreateShipmentRequest{
		ClientID:      "client-1",
		ClientName:    "Client",
		ClientEmail:   "client@test",
		FromStation:   "Алматы-1",
		ToStation:     "Ақтөбе",
		DepartureDate: time.Now().UTC(),
		Weight:        "10",
		Dimensions:    "10x10x10",
		Description:   "Box",
		Value:         "1000",
		Cost:          5000,
		QuantityPlaces: 1,
		ReceiverName: strPtr("Receiver"),
		ReceiverPhone: strPtr("+77010000001"),
	})
	if err != nil {
		t.Fatalf("create shipment: %v", err)
	}

	if _, err := services.Shipments.SendToPayment(context.Background(), shipment.ID); err != nil {
		t.Fatalf("send to payment: %v", err)
	}
	payment, err := services.Payments.Create(context.Background(), shipment.ID, shipment.Cost, "POS", nil)
	if err != nil {
		t.Fatalf("create payment: %v", err)
	}
	if _, _, err := services.Payments.Confirm(context.Background(), payment.ID, "operator-1"); err != nil {
		t.Fatalf("confirm payment: %v", err)
	}

	if _, _, err := services.Tracking.GenerateQRCode(context.Background(), shipment.ID); err != nil {
		t.Fatalf("generate qr: %v", err)
	}

	trackResp := httptest.NewRecorder()
	trackReq := httptest.NewRequest("GET", "/api/track/"+shipment.ShipmentNumber, nil)
	server.Router().ServeHTTP(trackResp, trackReq)
	if trackResp.Code != http.StatusOK {
		t.Fatalf("track failed: %d %s", trackResp.Code, trackResp.Body.String())
	}

	reportResp := httptest.NewRecorder()
	reportReq := httptest.NewRequest("GET", "/api/reports/status-summary", nil)
	reportReq.Header.Set("Authorization", "Bearer "+accountingToken)
	server.Router().ServeHTTP(reportResp, reportReq)
	if reportResp.Code != http.StatusOK {
		t.Fatalf("status summary failed: %d %s", reportResp.Code, reportResp.Body.String())
	}
}

func performJSON(t *testing.T, handler http.Handler, method, path string, payload any, token string) *httptest.ResponseRecorder {
	t.Helper()
	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal request: %v", err)
	}
	req := httptest.NewRequest(method, path, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp := httptest.NewRecorder()
	handler.ServeHTTP(resp, req)
	return resp
}

func decodeResponse(t *testing.T, resp *httptest.ResponseRecorder, dst any) {
	t.Helper()
	if err := json.Unmarshal(resp.Body.Bytes(), dst); err != nil {
		t.Fatalf("decode response: %v body=%s", err, resp.Body.String())
	}
}

func createEmployeeAndLogin(t *testing.T, server *Server, services service.Services, name, email, password string, role model.Role, station *string) string {
	t.Helper()
	if _, err := services.Admin.CreateEmployee(context.Background(), name, email, password, role, station); err != nil {
		t.Fatalf("create employee %s: %v", email, err)
	}
	resp := performJSON(t, server.Router(), "POST", "/api/auth/login", map[string]any{
		"email":    email,
		"password": password,
	}, "")
	if resp.Code != http.StatusOK {
		t.Fatalf("login %s failed: %d %s", email, resp.Code, resp.Body.String())
	}
	var payload map[string]any
	decodeResponse(t, resp, &payload)
	token, _ := payload["token"].(string)
	if token == "" {
		t.Fatalf("token missing for %s", email)
	}
	return token
}

func strPtr(value string) *string {
	return &value
}
