//go:build ignore
// +build ignore

package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"cargo/backend/internal/config"
	"cargo/backend/internal/model"
	"cargo/backend/internal/service"
	"cargo/backend/internal/storage/postgres"
)

func main() {
	cfg := config.Load()

	// Ensure we use the right DB URL
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = cfg.DatabaseURL
	}

	db, err := postgres.Open(dbURL)
	if err != nil {
		log.Fatalf("open postgres: %v", err)
	}
	defer db.Close()

	if err := db.Migrate(); err != nil {
		log.Printf("Note: migration error (can be ignored if already applied): %v", err)
	}

	repo := postgres.NewRepository(db.Pool())
	services := service.NewServices(repo, cfg.JWTSecret)

	ctx := context.Background()
	name := "Test Courier"
	login := "courier@cargo.kz"
	password := "courier123"
	role := model.RoleCourier

	user, _, err := services.Auth.Register(ctx, name, login, password, role, nil, nil)
	if err != nil {
		// If already exists, just print it
		fmt.Printf("Note: %v\n", err)
	} else {
		fmt.Printf("Successfully created courier: %s (%s)\n", user.Name, user.Login)
	}
}
