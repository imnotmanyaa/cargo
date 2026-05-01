package main

import (
	"context"
	"log"
	"net/http"

	"cargo/backend/internal/api"
	"cargo/backend/internal/config"
	"cargo/backend/internal/service"
	"cargo/backend/internal/storage/postgres"
)

func main() {
	cfg := config.Load()

	db, err := postgres.Open(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("open postgres: %v", err)
	}
	defer db.Close()

	if err := db.Migrate(); err != nil {
		log.Fatalf("migrate postgres: %v", err)
	}

	log.Println("STARTING WIPE OF DATABASE EXCEPT SPECIFIED USERS...")
	_, errWipe := db.Pool().Exec(context.Background(), `
		TRUNCATE wagon_shipments, wagons, shipments, shipment_history, notifications, audit_log, frequent_clients CASCADE;
		DELETE FROM users WHERE lower(btrim(email)) NOT IN (
			'co@cargo.kz',
			'almatapriem@cargo.kz',
			'admin@admin.com',
			'astanapriem@cargo.kz',
			'astana@cargo.kz',
			'admin@cargo.kz'
		);
	`)
	if errWipe != nil {
		log.Printf("wipe error: %v", errWipe)
	} else {
		log.Println("WIPED DATABASE SUCCESSFULLY!")
	}

	repo := postgres.NewRepository(db.Pool())
	services := service.NewServices(repo, cfg.JWTSecret)
	server, err := api.NewServer(cfg, services)
	if err != nil {
		log.Fatalf("create server: %v", err)
	}

	log.Printf("server listening on %s", cfg.Addr())
	if err := http.ListenAndServe(cfg.Addr(), server.Router()); err != nil {
		log.Fatalf("listen: %v", err)
	}
}
