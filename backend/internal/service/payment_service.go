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
	payment, err := s.repo.GetPayment(ctx, id)
	if err != nil {
		return model.Payment{}, model.Shipment{}, err
	}
	if payment.Status != model.PaymentPending {
		return model.Payment{}, model.Shipment{}, ErrInvalidTransition
	}
	now := time.Now().UTC()
	payment.Status = model.PaymentConfirmed
	payment.PaidAt = &now
	payment.ConfirmedBy = &confirmedBy
	payment, err = s.repo.UpdatePayment(ctx, payment)
	if err != nil {
		return model.Payment{}, model.Shipment{}, err
	}

	shipment, err := s.repo.GetShipmentByID(ctx, payment.ShipmentID)
	if err != nil {
		return model.Payment{}, model.Shipment{}, err
	}
	old := shipment.ShipmentStatus
	shipment.PaymentStatus = model.PaymentConfirmed
	shipment.ShipmentStatus = model.ShipmentPaid
	shipment.Status = legacyStatusForLifecycle(shipment.ShipmentStatus)
	shipment.LastUpdatedAt = now
	shipment.UpdatedAt = now
	shipment, err = s.repo.UpdateShipment(ctx, shipment)
	if err != nil {
		return model.Payment{}, model.Shipment{}, err
	}
	_ = s.repo.AddShipmentHistory(ctx, model.ShipmentHistory{
		ShipmentID: payment.ShipmentID,
		Action:     "Payment Confirmed",
		OperatorID: &confirmedBy,
		Details:    "Payment confirmed",
		OldStatus:  ptr(string(old)),
		NewStatus:  ptr(string(shipment.ShipmentStatus)),
		CreatedAt:  now,
	})
	_ = s.repo.AddAuditLog(ctx, model.AuditLog{
		ID:         uuid.NewString(),
		UserID:     &confirmedBy,
		EntityType: "payment",
		EntityID:   payment.ID,
		Action:     "CONFIRM_PAYMENT",
		NewValue:   ptr(string(payment.Status)),
		CreatedAt:  now,
	})
	return payment, shipment, nil
}
