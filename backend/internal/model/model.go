package model

import "time"

type Role string

const (
	RoleAdmin      Role = "admin"
	RoleManager    Role = "manager"
	RoleOperator   Role = "operator"
	RoleReceiver   Role = "receiver"
	RoleLoading    Role = "loading_operator"
	RoleTransit    Role = "transit_operator"
	RoleIssue      Role = "issue_operator"
	RoleAccounting Role = "accounting"
	RoleIndividual Role = "individual"
	RoleCorporate  Role = "corporate"
)

type ShipmentLifecycle string

const (
	ShipmentDraft           ShipmentLifecycle = "DRAFT"
	ShipmentCreated         ShipmentLifecycle = "CREATED"
	ShipmentPaymentPending  ShipmentLifecycle = "PAYMENT_PENDING"
	ShipmentPaid            ShipmentLifecycle = "PAID"
	ShipmentReadyForLoading ShipmentLifecycle = "READY_FOR_LOADING"
	ShipmentLoaded          ShipmentLifecycle = "LOADED"
	ShipmentInTransit       ShipmentLifecycle = "IN_TRANSIT"
	ShipmentArrived         ShipmentLifecycle = "ARRIVED"
	ShipmentReadyForIssue   ShipmentLifecycle = "READY_FOR_ISSUE"
	ShipmentIssued          ShipmentLifecycle = "ISSUED"
	ShipmentClosed          ShipmentLifecycle = "CLOSED"
	ShipmentCancelled       ShipmentLifecycle = "CANCELLED"
	ShipmentOnHold          ShipmentLifecycle = "ON_HOLD"
	ShipmentDamaged         ShipmentLifecycle = "DAMAGED"
)

type PaymentStatus string

const (
	PaymentUnpaid    PaymentStatus = "UNPAID"
	PaymentPending   PaymentStatus = "PENDING"
	PaymentConfirmed PaymentStatus = "CONFIRMED"
	PaymentFailed    PaymentStatus = "FAILED"
)

type User struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Email          string    `json:"email"`
	PasswordHash   string    `json:"-"`
	Role           Role      `json:"role"`
	Company        *string   `json:"company,omitempty"`
	DepositBalance float64   `json:"deposit_balance,omitempty"`
	ContractNumber *string   `json:"contract_number,omitempty"`
	Phone          *string   `json:"phone,omitempty"`
	Station        *string   `json:"station,omitempty"`
	IsActive       bool      `json:"is_active"`
	CreatedAt      time.Time `json:"created_at"`
}

type RoleRecord struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

type Station struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	City     string `json:"city"`
	Code     string `json:"code"`
	IsActive bool   `json:"is_active"`
}

type Shipment struct {
	ID               string            `json:"id"`
	ShipmentNumber   string            `json:"shipment_number"`
	ClientID         string            `json:"client_id"`
	ClientName       string            `json:"client_name"`
	ClientEmail      string            `json:"client_email"`
	FromStation      string            `json:"from_station"`
	ToStation        string            `json:"to_station"`
	CurrentStation   string            `json:"current_station"`
	NextStation      *string           `json:"next_station"`
	Route            []string          `json:"route"`
	Status           string            `json:"status"`
	ShipmentStatus   ShipmentLifecycle `json:"shipment_status"`
	PaymentStatus    PaymentStatus     `json:"payment_status"`
	DepartureDate    time.Time         `json:"departure_date"`
	Weight           string            `json:"weight"`
	Dimensions       string            `json:"dimensions"`
	Description      string            `json:"description"`
	Value            string            `json:"value"`
	Cost             float64           `json:"cost"`
	QuantityPlaces   int               `json:"quantity_places"`
	ReceiverName     *string           `json:"receiver_name,omitempty"`
	ReceiverPhone    *string           `json:"receiver_phone,omitempty"`
	TrainTime        *string           `json:"train_time,omitempty"`
	TrackingCode     *string           `json:"tracking_code,omitempty"`
	QRCodeID         *string           `json:"qr_code_id,omitempty"`
	TransportUnitID  *string           `json:"transport_unit_id,omitempty"`
	LastUpdatedAt    time.Time         `json:"last_updated_at"`
	CreatedBy        *string           `json:"created_by,omitempty"`
	CreatedAt        time.Time         `json:"created_at"`
	UpdatedAt        time.Time         `json:"updated_at"`
}

type ShipmentHistory struct {
	ID           int64     `json:"id"`
	ShipmentID   string    `json:"shipment_id"`
	Action       string    `json:"action"`
	OperatorID   *string   `json:"operator_id,omitempty"`
	OperatorName *string   `json:"operator_name,omitempty"`
	Station      *string   `json:"station,omitempty"`
	Details      string    `json:"details"`
	OldStatus    *string   `json:"old_status,omitempty"`
	NewStatus    *string   `json:"new_status,omitempty"`
	Reason       *string   `json:"reason,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

type Payment struct {
	ID            string        `json:"id"`
	ShipmentID    string        `json:"shipment_id"`
	Amount        float64       `json:"amount"`
	PaymentMethod string        `json:"payment_method"`
	POSReference  *string       `json:"pos_terminal_reference,omitempty"`
	PaidAt        *time.Time    `json:"paid_at,omitempty"`
	ConfirmedBy   *string       `json:"confirmed_by,omitempty"`
	Status        PaymentStatus `json:"status"`
	CreatedAt     time.Time     `json:"created_at"`
}

type QRCode struct {
	ID          string    `json:"id"`
	ShipmentID  string    `json:"shipment_id"`
	QRValue     string    `json:"qr_value"`
	GeneratedAt time.Time `json:"generated_at"`
	IsActive    bool      `json:"is_active"`
}

type ScanEvent struct {
	ID              string     `json:"id"`
	ShipmentID      string     `json:"shipment_id"`
	QRCodeID        *string    `json:"qr_code_id,omitempty"`
	EventType       string     `json:"event_type"`
	StationID       *string    `json:"station_id,omitempty"`
	TransportUnitID *string    `json:"transport_unit_id,omitempty"`
	UserID          *string    `json:"user_id,omitempty"`
	OldStatus       *string    `json:"old_status,omitempty"`
	NewStatus       *string    `json:"new_status,omitempty"`
	Comment         *string    `json:"comment,omitempty"`
	ScannedAt       time.Time  `json:"scanned_at"`
}

type TransitEvent struct {
	ID         string     `json:"id"`
	ShipmentID string     `json:"shipment_id"`
	StationID  string     `json:"station_id"`
	UserID     *string    `json:"user_id,omitempty"`
	EventTime  time.Time  `json:"event_time"`
	Comment    *string    `json:"comment,omitempty"`
}

type ArrivalEvent struct {
	ID                      string    `json:"id"`
	ShipmentID              string    `json:"shipment_id"`
	StationID               string    `json:"station_id"`
	UserID                  *string   `json:"user_id,omitempty"`
	EventTime               time.Time `json:"event_time"`
	ConfirmedAsFinalArrival bool      `json:"confirmed_as_final_arrival"`
}

type Notification struct {
	ID        int64     `json:"id"`
	UserID    string    `json:"user_id"`
	Message   string    `json:"message"`
	Read      bool      `json:"read"`
	Type      string    `json:"type"`
	RelatedID *string   `json:"related_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type AuditLog struct {
	ID         string     `json:"id"`
	UserID     *string    `json:"user_id,omitempty"`
	EntityType string     `json:"entity_type"`
	EntityID   string     `json:"entity_id"`
	Action     string     `json:"action"`
	OldValue   *string    `json:"old_value,omitempty"`
	NewValue   *string    `json:"new_value,omitempty"`
	StationID  *string    `json:"station_id,omitempty"`
	Reason     *string    `json:"reason,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
}

type RouteRevenue struct {
	Route      string  `json:"route"`
	Revenue    float64 `json:"revenue"`
	Count      int     `json:"count"`
	Percentage int     `json:"percentage,omitempty"`
}

type DashboardReport struct {
	MonthlyShipments   int            `json:"monthlyShipments"`
	CompletedShipments int            `json:"completedShipments"`
	ActiveContracts    int            `json:"activeContracts"`
	RevenueByRoute     []RouteRevenue `json:"revenueByRoute"`
}

type FinanceReport struct {
	PaidShipments      int     `json:"paid_shipments"`
	CompletedShipments int     `json:"completed_shipments"`
	TotalRevenue       float64 `json:"total_revenue"`
}

type StatusSummaryItem struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type ShipmentFilter struct {
	Type     string
	Station  string
	ClientID string
	Query    string
}

type ActionContext struct {
	Shipment       Shipment `json:"shipment"`
	UserRole       string   `json:"userRole"`
	AllowedActions []string `json:"allowedActions"`
	RequiresAuth   bool     `json:"requiresAuth"`
}
