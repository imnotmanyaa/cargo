package api

import (
	"fmt"
	"net/http"
	"time"

	"cargo/backend/internal/model"
	"cargo/backend/internal/whatsapp"

	"github.com/go-chi/chi/v5"
)

func (s *Server) mountArrivalRoutes(r chi.Router) {
	r.Get("/arrivals/pending", s.handlePendingArrivals)
	r.Post("/shipments/{id}/arrive", s.handleArriveShipment)
	r.Post("/shipments/{id}/ready-for-issue", s.handleReadyForIssue)
	r.Post("/shipments/{id}/notify-arrival", s.handleNotifyArrival)
}

func (s *Server) handlePendingArrivals(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.mustAuth(w, r); !ok {
		return
	}
	shipments, err := s.services.Shipments.List(r.Context(), model.ShipmentFilter{
		Type:    "arrived",
		Station: r.URL.Query().Get("station"),
	})
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipments)
}

func (s *Server) handleArriveShipment(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleReceiver, model.RoleManager, model.RoleAdmin); err != nil {
		handleServiceError(w, err)
		return
	}
	var req struct {
		CurrentStation string `json:"current_station"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := s.requireStation(user, req.CurrentStation); err != nil {
		handleServiceError(w, err)
		return
	}
	shipment, notification, err := s.services.Shipments.Arrive(r.Context(), chi.URLParam(r, "id"), req.CurrentStation, &user.ID, &user.Name)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	s.socket.BroadcastToRoom("/", s.stationRoom(shipment.CurrentStation), "shipment-updated", shipment)
	if notification != nil {
		s.socket.BroadcastToRoom("/", "user:"+notification.UserID, "notification:new", notification)
	}
	if shipment.IsDoorToDoor && shipment.ShipmentStatus == model.ShipmentReadyForIssue {
		s.socket.BroadcastToRoom("/", s.stationRoom(shipment.ToStation), "courier:new-task", shipment)
		
		// Опциональное эфемерное уведомление для курьеров (frontend может поймать)
		courierNotif := model.Notification{
			Message:   "Новая задача доставки: посылка " + shipment.ShipmentNumber + " прибыла в " + shipment.ToStation,
			Type:      "courier_new_task",
			CreatedAt: time.Now().UTC(),
		}
		s.socket.BroadcastToRoom("/", s.stationRoom(shipment.ToStation), "notification:new", courierNotif)
	}
	writeJSON(w, http.StatusOK, shipment)
}

func (s *Server) handleReadyForIssue(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleIssue, model.RoleAdmin, model.RoleManager, model.RoleReceiver); err != nil {
		handleServiceError(w, err)
		return
	}
	current, err := s.services.Shipments.Get(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}
	if err := s.requireStation(user, current.ToStation); err != nil {
		handleServiceError(w, err)
		return
	}
	shipment, err := s.services.Shipments.ReadyForIssue(r.Context(), chi.URLParam(r, "id"), &user.ID, &user.Name)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, shipment)
}

// handleNotifyArrival sends a WhatsApp message to the receiver that the shipment has arrived.
func (s *Server) handleNotifyArrival(w http.ResponseWriter, r *http.Request) {
	user, ok := s.mustAuth(w, r)
	if !ok {
		return
	}
	if err := s.requireRole(user, model.RoleManager, model.RoleAdmin, model.RoleReceiver); err != nil {
		handleServiceError(w, err)
		return
	}

	shipment, err := s.services.Shipments.Get(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		handleServiceError(w, err)
		return
	}

	// Determine receiver phone: prefer ReceiverPhone, then DoorToDoorPhone
	phone := ""
	if shipment.ReceiverPhone != nil && *shipment.ReceiverPhone != "" {
		phone = *shipment.ReceiverPhone
	} else if shipment.DoorToDoorPhone != nil && *shipment.DoorToDoorPhone != "" {
		phone = *shipment.DoorToDoorPhone
	}

	if phone == "" {
		writeError(w, http.StatusUnprocessableEntity, "Номер телефона получателя не указан для данной посылки")
		return
	}

	var msg string
	if shipment.IsDoorToDoor {
		msg = fmt.Sprintf("📦 Ваш груз %s прибыл в %s.\n\nКурьер скоро доставит его по указанному адресу. Ожидайте звонка!\nОтправитель: %s",
			shipment.ShipmentNumber, shipment.ToStation, shipment.ClientName)
	} else {
		msg = fmt.Sprintf("✅ Ваша посылка %s прибыла в %s.\n\nПриходите за грузом в офис с паспортом или удостоверением личности.\nОтправитель: %s",
			shipment.ShipmentNumber, shipment.ToStation, shipment.ClientName)
	}

	if err := whatsapp.SendMessage(phone, msg); err != nil {
		writeError(w, http.StatusBadGateway, "Ошибка WhatsApp: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "Уведомление отправлено на " + phone,
	})
	_ = time.Now()
}
