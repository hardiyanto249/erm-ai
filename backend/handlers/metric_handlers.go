package handlers

import (
	"encoding/json"
	"net/http"

	"backend/db"
)

func GetMetrics(w http.ResponseWriter, r *http.Request) {
	lazID := getLazID(r)
	metrics, err := db.GetMetrics(lazID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Convert array to map for easier frontend consumption like { "RHA": 14.8, "ACR": 8.5 }
	response := make(map[string]float64)
	for _, m := range metrics {
		response[m.Name] = m.Value
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
