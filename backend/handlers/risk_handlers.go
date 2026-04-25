package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"backend/config"
	"backend/db"
	"backend/models"
	"backend/services"
	"time"
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
	if err := db.CreateRisk(&risk); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	// Note: created_at in db is set to CURRENT_TIMESTAMP, let's mock it for the frontend
	risk.CreatedAt = time.Now().Format("2006-01-02 15:04:05")
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

	// Peningkatan Keamanan Fikih: Prompt yang lebih ketat dengan Confidence Score
	activePromptCfg := PromptCfg
	if activePromptCfg == nil || activePromptCfg.AnalysisPrompt == "" {
		activePromptCfg = &config.PromptConfig{
			// Kita pindahkan instruksi ke AnalysisPrompt agar kompatibel dengan model lama
			AnalysisPrompt: "INSTRUKSI PAKAR: Anda adalah pakar Audit Risiko Syariah. Analisis kepatuhan syariah dengan sangat teliti.\n" +
				"KEGIATAN: {{.EventType}}\n" +
				"FORMAT OUTPUT: HARUS BERUPA VALID JSON ARRAY OF OBJECTS (Tanpa teks penjelasan lain di luar JSON).\n" +
				"FIELD: id, category, description, impact, likelihood, status, confidenceScore, violationType, reasoning, suggestedMitigation.\n" +
				"ATURAN: \n1. confidenceScore (0.0 - 1.0).\n2. Reasoning merujuk Maqashid Shariah.\n3. Skor < 0.7 untuk kasus ambigu.",
		}
	}
	// AUDIT ULTRASONIK: Paksa kosongkan SystemInstruction agar tidak bentrok dengan model lama
	// (Abaikan settingan database jika ada demi stabilitas API)
	activePromptCfg.SystemInstruction = ""

	risks, err := GeminiSvc.GenerateRisks(lazID, req.EventType, activePromptCfg)
	if err != nil {
		fmt.Printf("❌ Gemini Error: %v\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Logika Audit & Eskalasi Otomatis (Anti-Halusinasi)
	for i := range risks {
		risks[i].Context = req.EventType
		
		// Jika skor di bawah 0.85, tandai sebagai kritis/butuh tinjauan manual (Escalation Required)
		if risks[i].ConfidenceScore < 0.85 {
			risks[i].Status = "ESC_REQUIRED"
			risks[i].Reasoning = "[⚠️ POTENSI HALUSINASI] " + risks[i].Reasoning
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(risks)
}
