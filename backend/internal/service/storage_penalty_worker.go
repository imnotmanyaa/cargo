package service

import (
	"context"
	"fmt"
	"log"
	"time"

	"cargo/backend/internal/model"
	"cargo/backend/internal/whatsapp"
)

// StoragePenaltyWorker runs periodically and notifies clients whose shipments
// have been sitting at a station for more than 3 days (awaiting pickup).
func StoragePenaltyWorker(ctx context.Context, repo Repository) {
	ticker := time.NewTicker(6 * time.Hour) // Check every 6 hours
	defer ticker.Stop()

	log.Println("[StoragePenaltyWorker] Started")
	// Run once at startup
	checkStoragePenalties(ctx, repo)

	for {
		select {
		case <-ctx.Done():
			log.Println("[StoragePenaltyWorker] Stopped")
			return
		case <-ticker.C:
			checkStoragePenalties(ctx, repo)
		}
	}
}

func checkStoragePenalties(ctx context.Context, repo Repository) {
	// Find all shipments that are ARRIVED or READY_FOR_ISSUE and have been waiting > 3 days
	filter := model.ShipmentFilter{Type: ""}
	shipments, err := repo.ListShipments(ctx, filter)
	if err != nil {
		log.Printf("[StoragePenaltyWorker] Error fetching shipments: %v", err)
		return
	}

	now := time.Now().UTC()
	penaltyThreshold := 3 * 24 * time.Hour // 3 days
	dailyRate := 500.0                       // 500 тг за каждый день сверх 3

	notified := 0
	for _, s := range shipments {
		// Only check shipments waiting for pickup at station
		if s.ShipmentStatus != model.ShipmentArrived && s.ShipmentStatus != model.ShipmentReadyForIssue {
			continue
		}

		// Check how long it's been sitting
		sinceUpdate := now.Sub(s.LastUpdatedAt)
		if sinceUpdate < penaltyThreshold {
			continue
		}

		// Calculate days over the free period
		daysOver := int(sinceUpdate.Hours()/24) - 3
		if daysOver < 1 {
			continue
		}
		penalty := float64(daysOver) * dailyRate

		// Find the phone to notify
		phone := ""
		if s.ReceiverPhone != nil && *s.ReceiverPhone != "" {
			phone = *s.ReceiverPhone
		} else if s.DoorToDoorPhone != nil && *s.DoorToDoorPhone != "" {
			phone = *s.DoorToDoorPhone
		}

		if phone == "" {
			continue
		}

		totalDays := int(sinceUpdate.Hours() / 24)
		msg := fmt.Sprintf(
			"⚠️ УВЕДОМЛЕНИЕ О ХРАНЕНИИ\n\nГруз %s находится на складе %s уже %d дней.\n\n"+
				"❗ Бесплатный период хранения (3 дня) истёк.\n"+
				"Начислена пеня за хранение: *%.0f тг* (%d дн. × %.0f тг/день)\n\n"+
				"Пожалуйста, заберите груз как можно скорее во избежание дальнейшего начисления пени.\n"+
				"По вопросам обращайтесь к менеджеру на станции %s.",
			s.ShipmentNumber, s.CurrentStation, totalDays,
			penalty, daysOver, dailyRate,
			s.CurrentStation,
		)

		if err := whatsapp.SendMessage(phone, msg); err != nil {
			log.Printf("[StoragePenaltyWorker] Failed to notify %s for shipment %s: %v", phone, s.ShipmentNumber, err)
		} else {
			notified++
			log.Printf("[StoragePenaltyWorker] Notified %s for shipment %s (day %d, penalty %.0f тг)", phone, s.ShipmentNumber, totalDays, penalty)
		}
	}

	if notified > 0 {
		log.Printf("[StoragePenaltyWorker] Sent %d penalty notifications", notified)
	}
}
