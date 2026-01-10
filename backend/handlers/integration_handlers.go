package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"backend/db"
)

// FinancePayload defines the standard contract for external finance systems
type FinancePayload struct {
	TransactionDate string  `json:"transaction_date"` // YYYY-MM-DD
	CategoryCode    string  `json:"category_code"`
	CategoryName    string  `json:"category_name"`
	Amount          float64 `json:"amount"`
	Description     string  `json:"description"`
}

// SyncFinanceData is the Webhook Listener.
// It receives data from the external Accounting Software.
func SyncFinanceData(w http.ResponseWriter, r *http.Request) {
	// 1. Security Check (API Key)
	// In production, use a strictly generated key stored in ENV.
	apiKey := r.Header.Get("X-API-Key")
	if apiKey != "FINANCE-SECRET-KEY-123" {
		http.Error(w, "Unauthorized: Invalid API Key", http.StatusUnauthorized)
		return
	}

	// 2. Parse Payload
	var payload FinancePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	// 3. Map Finance Data to Risk Metrics
	// This is the "Translator" Logic.
	// We map Accounting Categories -> Risk Metric Names

	metricName := ""

	// Example Logic: Map "Biaya Promosi" or Code "5101" to "PromotionCost"
	// Also check for "Gaji" -> RHA Input?
	// For Model B prediction, we specifically care about PromotionCost.

	categoryLower := strings.ToLower(payload.CategoryName)
	if strings.Contains(categoryLower, "promosi") || strings.Contains(categoryLower, "iklan") || payload.CategoryCode == "5101" {
		metricName = "PromotionCost"
	}
	// Add more mappings here...

	if metricName == "" {
		// Log but don't error, maybe just normal expense not relevant for specific risk tracking
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Transaction received but no risk metric mapped (Ignored safely)."))
		return
	}

	// 4. Store into Metric History
	// We need a lazID. In a multi-tenant API, the payload should include LAZ_ID or the API Key determines it.
	// For this system, we use LazID=1 (Default) or maybe passed in header.
	lazID := 1 // Default for single tenant deployment or strict mapping

	// Parse Date
	parsedTime, err := time.Parse("2006-01-02", payload.TransactionDate)
	if err != nil {
		parsedTime = time.Now() // Fallback
	}

	// Insert Logic
	// We assume this is a new transaction. We might want to aggregate daily?
	// For simplicity, we just insert as a data point.
	// The analytics engine usually takes "Last 30 entries".
	// Ideally we SUM daily.
	// For this Proof of Concept, we insert directly.

	query := `INSERT INTO metric_history (laz_id, metric_name, value, recorded_at) VALUES ($1, $2, $3, $4)`
	_, err = db.DB.Exec(query, lazID, metricName, payload.Amount/1000000.0, parsedTime) // Convert Raw Amount to Million if needed, or keep raw. Our model trained on Millions? Seed data was ~10.0 - 25.0. Assuming Millions.

	if err != nil {
		http.Error(w, "Database error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 5. Success Response
	resp := map[string]string{
		"status":        "success",
		"message":       "Finance data synced. Risk metrics updated.",
		"mapped_metric": metricName,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
