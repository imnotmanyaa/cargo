package worker

import (
	"context"
	"fmt"
	"log"
	"time"

	"cargo/backend/internal/model"
	"cargo/backend/internal/service"

	socketio "github.com/googollee/go-socket.io"
)

// StartTransitWorker запускает фоновый процесс, который каждые 5 минут проверяет
// посылки в статусе LOADED и автоматически переводит их в IN_TRANSIT,
// если прошло больше delay времени с момента последнего обновления.
//
// Конфигурируется через переменную среды AUTO_TRANSIT_DELAY_MINUTES (по умолчанию 60).
func StartTransitWorker(ctx context.Context, shipments *service.ShipmentService, delay time.Duration, socket *socketio.Server, repo service.Repository) {
	log.Printf("[transit-worker] запущен. Задержка: %v. Проверка каждые 30 секунд.", delay)
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	// Запускаем сразу при старте, не ждём первого тика
	runTransition(ctx, shipments, delay, socket, repo)

	for {
		select {
		case <-ctx.Done():
			log.Println("[transit-worker] остановлен.")
			return
		case <-ticker.C:
			runTransition(ctx, shipments, delay, socket, repo)
		}
	}
}

func runTransition(ctx context.Context, shipments *service.ShipmentService, delay time.Duration, socket *socketio.Server, repo service.Repository) {
	candidates, err := shipments.ListLoadedForTransit(ctx, delay)
	if err != nil {
		log.Printf("[transit-worker] ошибка получения списка: %v", err)
		return
	}
	if len(candidates) == 0 {
		return
	}
	log.Printf("[transit-worker] найдено %d посылок для перевода в IN_TRANSIT", len(candidates))
	for _, sh := range candidates {
		updated, err := shipments.Dispatch(ctx, sh.ID, nil, nil, nil)
		if err != nil {
			log.Printf("[transit-worker] ошибка перевода %s: %v", sh.ShipmentNumber, err)
			continue
		}
		log.Printf("[transit-worker] посылка %s переведена в IN_TRANSIT", sh.ShipmentNumber)

		// Broadcast обновление по сокету
		if socket != nil {
			socket.BroadcastToRoom("/", "station:"+updated.FromStation, "shipment-updated", updated)
			socket.BroadcastToRoom("/", "station:"+updated.ToStation, "shipment-updated", updated)
		}

		// In-app уведомление отправителю
		senderMsg := fmt.Sprintf("🚂 Ваша посылка %s в пути! Маршрут: %s → %s", updated.ShipmentNumber, updated.FromStation, updated.ToStation)
		senderNotif, _ := repo.CreateNotification(ctx, model.Notification{
			UserID:  updated.ClientID,
			Message: senderMsg,
			Type:    "shipment_in_transit",
		})
		if socket != nil && senderNotif.ID != 0 {
			socket.BroadcastToRoom("/", "user:"+updated.ClientID, "notification:new", senderNotif)
		}
	}
}

// ListLoadedForTransit возвращает посылки в статусе LOADED,
// которые были погружены более delay назад.
// Метод добавлен в ShipmentService для использования воркером.
var _ = model.ShipmentLoaded // подтверждаем что константа используется
