package worker

import (
	"context"
	"log"
	"time"

	"cargo/backend/internal/model"
	"cargo/backend/internal/service"
)

// StartTransitWorker запускает фоновый процесс, который каждые 5 минут проверяет
// посылки в статусе LOADED и автоматически переводит их в IN_TRANSIT,
// если прошло больше delay времени с момента последнего обновления.
//
// Конфигурируется через переменную среды AUTO_TRANSIT_DELAY_MINUTES (по умолчанию 60).
func StartTransitWorker(ctx context.Context, shipments *service.ShipmentService, delay time.Duration) {
	log.Printf("[transit-worker] запущен. Задержка: %v. Проверка каждые 5 минут.", delay)
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	// Запускаем сразу при старте, не ждём первого тика
	runTransition(ctx, shipments, delay)

	for {
		select {
		case <-ctx.Done():
			log.Println("[transit-worker] остановлен.")
			return
		case <-ticker.C:
			runTransition(ctx, shipments, delay)
		}
	}
}

func runTransition(ctx context.Context, shipments *service.ShipmentService, delay time.Duration) {
	candidates, err := shipments.ListLoadedForTransit(ctx, delay)
	if err != nil {
		log.Printf("[transit-worker] ошибка получения списка: %v", err)
		return
	}
	if len(candidates) == 0 {
		return
	}
	log.Printf("[transit-worker] найдено %d посылок для перевода в IN_TRANSIT", len(candidates))
	for _, s := range candidates {
		_, err := shipments.Dispatch(ctx, s.ID, nil, nil, nil)
		if err != nil {
			log.Printf("[transit-worker] ошибка перевода %s: %v", s.ShipmentNumber, err)
			continue
		}
		log.Printf("[transit-worker] посылка %s переведена в IN_TRANSIT", s.ShipmentNumber)
	}
}

// ListLoadedForTransit возвращает посылки в статусе LOADED,
// которые были погружены более delay назад.
// Метод добавлен в ShipmentService для использования воркером.
var _ = model.ShipmentLoaded // подтверждаем что константа используется
