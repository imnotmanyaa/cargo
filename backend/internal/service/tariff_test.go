package service

import (
	"testing"
)

func TestCalculateCostByTariff(t *testing.T) {
	tests := []struct {
		name          string
		from          string
		to            string
		weight        string
		description   string
		isDoorToDoor  bool
		isIndividual  bool
		expectedCost  float64
	}{
		{
			name:         "Base case: Almaty to Astana 10kg",
			from:         "Алматы-1",
			to:           "Астана Нұрлы Жол",
			weight:       "10",
			description:  "Normal cargo",
			isDoorToDoor: false,
			isIndividual: true,
			expectedCost: 976,
		},
		{
			name:         "Individual Door-to-Door (+10,000)",
			from:         "Алматы-1",
			to:           "Астана Нұрлы Жол",
			weight:       "10",
			description:  "Normal cargo",
			isDoorToDoor: true,
			isIndividual: true,
			expectedCost: 10976,
		},
		{
			name:         "Corporate Door-to-Door (No surcharge)",
			from:         "Алматы-1",
			to:           "Астана Нұрлы Жол",
			weight:       "10",
			description:  "Normal cargo",
			isDoorToDoor: true,
			isIndividual: false,
			expectedCost: 976,
		},
		{
			name:         "Fragile Surcharge (+1,000)",
			from:         "Алматы-1",
			to:           "Астана Нұрлы Жол",
			weight:       "10",
			description:  "Хрупкий груз",
			isDoorToDoor: false,
			isIndividual: true,
			expectedCost: 1976,
		},
		{
			name:         "Oversized Surcharge (+2,500)",
			from:         "Алматы-1",
			to:           "Астана Нұрлы Жол",
			weight:       "10",
			description:  "Негабаритный груз",
			isDoorToDoor: false,
			isIndividual: true,
			expectedCost: 3476,
		},
		{
			name:         "Combined Surcharges (Individual + D2D + Fragile)",
			from:         "Алматы-1",
			to:           "Астана Нұрлы Жол",
			weight:       "10",
			description:  "Очень хрупкий",
			isDoorToDoor: true,
			isIndividual: true,
			expectedCost: 11976, // 976 + 10000 + 1000
		},
		{
			name:         "Different Route: Karaganda to Almaty 20kg",
			from:         "Қарағанды",
			to:           "Алматы-1",
			weight:       "20",
			description:  "Normal",
			isDoorToDoor: false,
			isIndividual: true,
			expectedCost: 1650, // (20/10) * 825
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cost := calculateCostByTariff(tt.from, tt.to, tt.weight, tt.description, tt.isDoorToDoor, tt.isIndividual)
			if cost != tt.expectedCost {
				t.Errorf("calculateCostByTariff() = %v, want %v", cost, tt.expectedCost)
			}
		})
	}
}
