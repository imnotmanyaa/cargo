
package service

import (
	"fmt"
	"math"
	"strings"
)

var routeRates = map[string]float64{
	"алматы-1-астана нұрлы жол": 976,
	"астана нұрлы жол-алматы-1": 976,
	"алматы-1-қарағанды":      825,
	"қарағанды-алматы-1":      825,
	"алматы-1-атырау":         1145,
	"атырау-алматы-1":         1145,
	"алматы-1-шымкент":        590,
	"шымкент-алматы-1":        590,
	"алматы-1-ақтөбе":         1114,
	"ақтөбе-алматы-1":         1114,
	"астана нұрлы жол-қарағанды": 400,
	"қарағанды-астана нұрлы жол": 400,
	"шымкент-қарағанды":       1200,
	"қарағанды-шымкент":       1200,
	"астана нұрлы жол-ақтөбе": 850,
	"ақтөбе-астана нұрлы жол": 850,
}

func getBaseRate(from, to string) float64 {
	key := strings.ToLower(strings.TrimSpace(from)) + "-" + strings.ToLower(strings.TrimSpace(to))
	if rate, ok := routeRates[key]; ok {
		return rate
	}
	return 5000 // Fallback
}

func calculateCostByTariff(fromStation, toStation string, weightStr string, description string) float64 {
	if fromStation == "" || toStation == "" || weightStr == "" {
		return 0
	}
	
	var weight float64
	_, err := fmt.Sscanf(weightStr, "%f", &weight)
	if err != nil || weight <= 0 {
		return 0
	}

	rate := getBaseRate(fromStation, toStation)
	cost := (weight / 10.0) * rate

	descLower := strings.ToLower(description)
	isFragile := strings.Contains(descLower, "хрупк") || strings.Contains(descLower, "fragile")
	isOversized := strings.Contains(descLower, "негабарит") || strings.Contains(descLower, "oversize")
	
	if isFragile {
		cost += 1000
	}
	if isOversized {
		cost += 2500
	}
	// For ticket discount, we'd need that parameter from the DB (Shipment doesn't currently store 'hasTicket' natively to recalculate identically from nothing without it mapped)
	// We'll trust Cost for initial, but for calculate-tariff we replicate core logic.

	return math.Round(cost)
}
