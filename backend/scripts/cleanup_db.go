package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5"
)

// Очистка всех клиентов, посылок и аудита. Стафф остаётся.
func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	ctx := context.Background()
	conn, err := pgx.Connect(ctx, dbURL)
	if err != nil {
		log.Fatal("DB connect error:", err)
	}
	defer conn.Close(ctx)

	queries := []struct {
		desc string
		sql  string
	}{
		{"Удаление scan_events", "DELETE FROM scan_events"},
		{"Удаление transit_events", "DELETE FROM transit_events"},
		{"Удаление arrival_events", "DELETE FROM arrival_events"},
		{"Удаление shipment_histories", "DELETE FROM shipment_histories"},
		{"Удаление payments", "DELETE FROM payments"},
		{"Удаление notifications", "DELETE FROM notifications"},
		{"Удаление qr_codes", "DELETE FROM qr_codes"},
		{"Удаление audit_logs", "DELETE FROM audit_logs"},
		{"Удаление shipments", "DELETE FROM shipments"},
		{"Удаление клиентов (individual + corporate)", "DELETE FROM users WHERE role IN ('individual', 'corporate')"},
	}

	for _, q := range queries {
		tag, err := conn.Exec(ctx, q.sql)
		if err != nil {
			fmt.Printf("⚠ %s: %v\n", q.desc, err)
		} else {
			fmt.Printf("✅ %s: %d rows\n", q.desc, tag.RowsAffected())
		}
	}

	// Проверка: сколько стаффа осталось
	var staffCount int
	err = conn.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&staffCount)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("\n🏢 Осталось сотрудников: %d\n", staffCount)
	fmt.Println("✅ Очистка завершена!")
}
