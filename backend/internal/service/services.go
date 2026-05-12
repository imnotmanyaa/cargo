package service

import (
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"cargo/backend/internal/model"
)

var stationsOrder = []string{"Шымкент", "Алматы-1", "Қарағанды", "Астана Нұрлы Жол", "Ақтөбе", "Атырау"}

var (
	ErrUnauthorized       = errors.New("необходима авторизация")
	ErrForbidden          = errors.New("доступ запрещен")
	ErrInvalidCredentials = errors.New("неверный логин или пароль")
	ErrDuplicateLogin     = errors.New("пользователь с таким логином уже существует")
	ErrNotFound           = errors.New("не найдено")
	ErrStationMismatch    = errors.New("ошибка привязки станции")
	ErrInvalidTransition  = errors.New("недопустимый переход статуса")
	ErrInvalidState       = errors.New("некорректное состояние груза")
	ErrInvalidPinCode     = errors.New("неверный PIN-код для получения")
	ErrInsufficientFunds  = errors.New("недостаточно средств на депозите")
	ErrPaymentRequired    = errors.New("требуется доплата за перевес")
	ErrValidation         = errors.New("ошибка валидации данных")
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
	Wagons        *WagonService
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
		Wagons:        &WagonService{repo: repo},
	}
}

type otpData struct {
	Code      string
	ExpiresAt time.Time
}

type AuthService struct {
	repo      Repository
	jwtSecret string
	blacklist sync.Map
	otpStore  sync.Map
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

func (s *ShipmentService) Repo() Repository { return s.repo }

type AuthenticatedUser struct {
	ID      string
	Login   string
	Role    model.Role
	Name    string
	Station string
	Phone   *string
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

func normalizeLogin(login string) string {
	login = strings.ToLower(strings.TrimSpace(login))
	
	// If it looks like a phone number (digits, plus, parens, dashes)
	// we normalize it to a clean digit string
	isPhone := true
	var digits strings.Builder
	for _, r := range login {
		if r >= '0' && r <= '9' {
			digits.WriteRune(r)
			continue
		}
		if r == '+' || r == '(' || r == ')' || r == '-' || r == ' ' {
			continue
		}
		// Found a non-phone character (like a letter in an email)
		isPhone = false
		break
	}

	if isPhone && digits.Len() >= 10 {
		phone := digits.String()
		// Normalize 8XXXXXXXXXX to 7XXXXXXXXXX
		if len(phone) == 11 && phone[0] == '8' {
			phone = "7" + phone[1:]
		}
		// Normalize missing country code (7XXXXXXXXX -> 77XXXXXXXXX)
		// But only if it's 10 digits and starts with 7
		// Actually most common case in KZ is 11 digits starting with 7
		return phone
	}

	return login
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
	case model.ShipmentCreatedDoor:
		return "Заявка door-to-door создана"
	case model.ShipmentPickupAssigned:
		return "Назначено курьеру"
	case model.ShipmentPickedUp:
		return "Забрано курьером"
	case model.ShipmentAtStationIntake:
		return "На приемке в багажном отделении"
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
	case model.ShipmentDeliveryAssigned:
		return "Курьер забирает из отделения"
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
