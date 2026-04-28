package main

import (
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
