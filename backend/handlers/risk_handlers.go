package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"backend/config"
	"backend/db"
	"backend/models"
	"backend/services"
)

// Injected dependencies
var (
	GeminiSvc *services.GeminiService
	PromptCfg *config.PromptConfig
)

func GetRisks(w http.ResponseWriter, r *http.Request) {
	lazID := getLazID(r)
	risks, err := db.GetRisks(lazID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(risks)
}

func CreateRisk(w http.ResponseWriter, r *http.Request) {
	lazID := getLazID(r)
	var risk models.Risk
	if err := json.NewDecoder(r.Body).Decode(&risk); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	risk.LazID = lazID // Force the LazID to match context
	if err := db.CreateRisk(risk); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(risk)
}

func UpdateRisk(w http.ResponseWriter, r *http.Request) {
	lazID := getLazID(r) // Ensure we are updating risk for correct LAZ
	var risk models.Risk
	if err := json.NewDecoder(r.Body).Decode(&risk); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	risk.LazID = lazID
	if err := db.UpdateRisk(risk); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(risk)
}

func DeleteRisk(w http.ResponseWriter, r *http.Request) {
	lazID := getLazID(r)
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "Missing id", http.StatusBadRequest)
		return
	}
	if err := db.DeleteRisk(id, lazID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func GenerateRisks(w http.ResponseWriter, r *http.Request) {
	lazID := getLazID(r)
	var req struct {
		EventType string `json:"eventType"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if GeminiSvc == nil {
		http.Error(w, "AI Service not initialized", http.StatusInternalServerError)
		return
	}

	risks, err := GeminiSvc.GenerateRisks(lazID, req.EventType, PromptCfg)
	if err != nil {
		fmt.Printf("❌ Gemini Error: %v\n", err) // Add logging
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(risks)
}
