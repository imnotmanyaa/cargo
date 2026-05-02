//go:build ignore
// +build ignore

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
		ALTER TABLE shipments
		ADD COLUMN IF NOT EXISTS pickup_code VARCHAR(10),
		ADD COLUMN IF NOT EXISTS issue_code VARCHAR(10);
	`)
	if err != nil {
		log.Fatalf("Failed to alter table: %v", err)
	}
	fmt.Println("Successfully added pickup_code and issue_code to shipments table.")
}
