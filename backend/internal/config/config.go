package config

import (
	"os"
)

type Config struct {
	Port               string
	DatabaseURL        string
	JWTSecret          string
	CORSAllowedOrigins string // comma-separated; empty or "*" = allow all (dev only)
}

func Load() Config {
	cfg := Config{
		Port:               getenv("PORT", "8080"),
		DatabaseURL:        getenv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/cargotrans?sslmode=disable"),
		JWTSecret:          getenv("JWT_SECRET", "dev-secret"),
		CORSAllowedOrigins: getenv("CORS_ALLOWED_ORIGINS", "*"),
	}
	return cfg
}

func (c Config) Addr() string {
	return ":" + c.Port
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
