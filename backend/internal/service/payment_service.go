package service

import (
	"context"
	"time"

	"cargo/backend/internal/model"

	"github.com/google/uuid"
)

func (s *PaymentService) Create(ctx context.Context, shipmentID string, amount float64, method string, posRef *string) (model.Payment, error) {
	shipment, err := s.repo.GetShipmentByID(ctx, shipmentID)
	if err != nil {
		return model.Payment{}, err
	}
	if shipment.ShipmentStatus != model.ShipmentPaymentPending {
		return model.Payment{}, ErrInvalidTransition
	}
	payment := model.Payment{
		ID:            uuid.NewString(),
		ShipmentID:    shipmentID,
		Amount:        amount,
		PaymentMethod: method,
		POSReference:  posRef,
		Status:        model.PaymentPending,
		CreatedAt:     time.Now().UTC(),
	}
	return s.repo.CreatePayment(ctx, payment)
}

func (s *PaymentService) Get(ctx context.Context, id string) (model.Payment, error) {
	return s.repo.GetPayment(ctx, id)
}

func (s *PaymentService) Confirm(ctx context.Context, id string, confirmedBy string) (model.Payment, model.Shipment, error) {
	// Let the database transaction handle all locking and updates atomically.
	payment, shipment, err := s.repo.ConfirmPaymentTx(ctx, id, confirmedBy)
	if err != nil {
		return model.Payment{}, model.Shipment{}, err
	}
	
	// Audit logging (done outside tx to keep tx short, or could be in tx too. We'll leave it here to avoid changing AuditLog interface)
	_ = s.repo.AddAuditLog(ctx, model.AuditLog{
		ID:         uuid.NewString(),
		UserID:     &confirmedBy,
		EntityType: "payment",
		EntityID:   payment.ID,
		Action:     "CONFIRM_PAYMENT",
		NewValue:   ptr(string(payment.Status)),
		CreatedAt:  time.Now().UTC(),
	})
	return payment, shipment, nil
}

func (s *PaymentService) ListByUser(ctx context.Context, userID string) ([]model.Payment, error) {
	return s.repo.ListPaymentsByUser(ctx, userID)
}
