package main

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	dbURL := "postgres://postgres:postgres@localhost:5432/cargotrans?sslmode=disable"
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	_, err = pool.Exec(context.Background(), `
		TRUNCATE shipments, shipment_history, notifications, scan_events, transit_events, arrival_events, qr_codes, payments CASCADE;
	`)
	if err != nil {
		log.Fatalf("Failed to truncate tables: %v", err)
	}
	fmt.Println("Database successfully wiped of all shipments and related events.")
}
