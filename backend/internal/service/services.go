package service

import (
	"errors"
	"fmt"
	"strings"

	"cargo/backend/internal/model"
)

var stationsOrder = []string{"Шымкент", "Алматы-1", "Қарағанды", "Астана Нұрлы Жол", "Ақтөбе"}

var (
	ErrUnauthorized       = errors.New("unauthorized")
	ErrForbidden          = errors.New("forbidden")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrDuplicateEmail     = errors.New("email already exists")
	ErrNotFound           = errors.New("not found")
	ErrInvalidTransition  = errors.New("invalid status transition")
	ErrInvalidState       = errors.New("invalid state")
	ErrValidation         = errors.New("validation error")
)

type Services struct {
	Auth          *AuthService
	Admin         *AdminService
	Clients       *ClientService
	Reference     *ReferenceService
	Shipments     *ShipmentService
	Payments      *PaymentService
	Tracking      *TrackingService
	Notifications *NotificationService
	Reports       *ReportService
	Audit         *AuditService
}

func NewServices(repo Repository, jwtSecret string) Services {
	return Services{
		Auth:          &AuthService{repo: repo, jwtSecret: jwtSecret},
		Admin:         &AdminService{repo: repo},
		Clients:       &ClientService{repo: repo},
		Reference:     &ReferenceService{repo: repo},
		Shipments:     &ShipmentService{repo: repo},
		Payments:      &PaymentService{repo: repo},
		Tracking:      &TrackingService{repo: repo},
		Notifications: &NotificationService{repo: repo},
		Reports:       &ReportService{repo: repo},
		Audit:         &AuditService{repo: repo},
	}
}

type AuthService struct {
	repo      Repository
	jwtSecret string
}

type AdminService struct{ repo Repository }
type ClientService struct{ repo Repository }
type ReferenceService struct{ repo Repository }
type PaymentService struct{ repo Repository }
type TrackingService struct{ repo Repository }
type NotificationService struct{ repo Repository }
type ReportService struct{ repo Repository }
type AuditService struct{ repo Repository }
type ShipmentService struct{ repo Repository }

type AuthenticatedUser struct {
	ID      string
	Email   string
	Role    model.Role
	Name    string
	Station string
}

func calculateRoute(from, to string) []string {
	fromIndex := indexOf(stationsOrder, from)
	toIndex := indexOf(stationsOrder, to)
	if fromIndex == -1 || toIndex == -1 {
		return []string{from, to}
	}
	if fromIndex < toIndex {
		return append([]string{}, stationsOrder[fromIndex:toIndex+1]...)
	}
	result := append([]string{}, stationsOrder[toIndex:fromIndex+1]...)
	for i, j := 0, len(result)-1; i < j; i, j = i+1, j-1 {
		result[i], result[j] = result[j], result[i]
	}
	return result
}

func indexOf(items []string, target string) int {
	for i, item := range items {
		if item == target {
			return i
		}
	}
	return -1
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func ptr[T any](value T) *T {
	return &value
}

func legacyStatusForLifecycle(state model.ShipmentLifecycle) string {
	switch state {
	case model.ShipmentDraft:
		return "Черновик"
	case model.ShipmentCreated:
		return "Создан"
	case model.ShipmentPaymentPending:
		return "Ожидает оплаты"
	case model.ShipmentPaid:
		return "Оплачен"
	case model.ShipmentReadyForLoading:
		return "Готов к погрузке"
	case model.ShipmentLoaded:
		return "Погружен"
	case model.ShipmentInTransit:
		return "В пути"
	case model.ShipmentArrived:
		return "Прибыл"
	case model.ShipmentReadyForIssue:
		return "Готов к выдаче"
	case model.ShipmentIssued:
		return "Выдан"
	case model.ShipmentClosed:
		return "Закрыт"
	case model.ShipmentCancelled:
		return "Отменен"
	case model.ShipmentOnHold:
		return "На удержании"
	case model.ShipmentDamaged:
		return "Поврежден"
	default:
		return fmt.Sprintf("%s", state)
	}
}
