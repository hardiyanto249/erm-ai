package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"backend/db"
	"backend/utils"
)

// GetAnomalyCheck performs a real-time anomaly detection for a specific metric.
func GetAnomalyCheck(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	lazID := getLazID(r)
	if lazID == 0 {
		http.Error(w, "LAZ ID required", http.StatusBadRequest)
		return
	}

	currentRHA := 0.0
	currentACR := 0.0

	// Check current metrics from DB
	metrics, _ := db.GetMetrics(lazID)
	for _, m := range metrics {
		if m.Name == "RHA" {
			currentRHA = m.Value
		}
		if m.Name == "ACR" {
			currentACR = m.Value
		}
	}

	rhaAnalysis := utils.DetectAnomaly(lazID, "RHA", currentRHA)
	acrAnalysis := utils.DetectAnomaly(lazID, "ACR", currentACR)

	resp := map[string]interface{}{
		"RHA": rhaAnalysis,
		"ACR": acrAnalysis,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// runPredictionHelper_Dynamic automatically finds all available predictors
func runPredictionHelper(lazID int, targetName string, excludedMetrics []string) map[string]interface{} {
	// 1. Fetch All Data for valid variables (exclude if value is null? standard scan handles it)
	// We want all metrics
	rows, err := db.DB.Query("SELECT metric_name, value, recorded_at FROM metric_history WHERE laz_id=$1 ORDER BY recorded_at ASC", lazID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	// Pivot: date -> metric -> value
	dataMap := make(map[string]map[string]float64)
	allMetrics := make(map[string]bool)

	for rows.Next() {
		var name string
		var val float64
		var date time.Time
		if err := rows.Scan(&name, &val, &date); err != nil {
			continue
		}
		dKey := date.Format("2006-01-02")

		if _, ok := dataMap[dKey]; !ok {
			dataMap[dKey] = make(map[string]float64)
		}
		dataMap[dKey][name] = val
		allMetrics[name] = true
	}

	// Helper to check exclusion (Fuzzy Match)
	isExcluded := func(n string) bool {
		lowerN := strings.ToLower(n)
		// 1. Exclude if matches explicit blacklist
		for _, e := range excludedMetrics {
			if strings.Contains(lowerN, strings.ToLower(e)) {
				return true
			}
		}
		// 2. Exclude if matches target name (Self-Correlation Guard)
		// e.g. Target "RHA", Metric "Rasio Hak Amil (RHA)"
		if strings.Contains(lowerN, strings.ToLower(targetName)) {
			return true
		}
		// Special Alias handling
		if targetName == "RHA" && strings.Contains(lowerN, "rasio hak amil") {
			return true
		}
		if targetName == "ACR" && strings.Contains(lowerN, "saldo kas") {
			return true
		}
		return false
	}

	// Identify Predictors: All metrics EXCEPT the target AND excluded ones
	var predictors []string
	for m := range allMetrics {
		if !isExcluded(m) {
			predictors = append(predictors, m)
		}
	}
	if len(predictors) == 0 {
		return nil
	}
	// Sort predictors for consistent matrix column order
	sort.Strings(predictors)

	// ... Data Building ... (Same as before)
	// Build X and Y matrices
	var xData, yData []float64
	var validRows int

	// Sort dates
	var sortedDates []string
	for k := range dataMap {
		sortedDates = append(sortedDates, k)
	}
	sort.Strings(sortedDates)

	// Helper to get matching rows
	getRows := func(preds []string) ([]float64, []float64, int) {
		var y []float64
		var x []float64
		count := 0
		for _, d := range sortedDates {
			metrics := dataMap[d]
			if targetVal, ok := metrics[targetName]; ok {
				var rowX []float64
				complete := true
				for _, p := range preds {
					if val, ok := metrics[p]; ok {
						rowX = append(rowX, val)
					} else {
						complete = false
						break
					}
				}
				if complete {
					y = append(y, targetVal)
					x = append(x, rowX...)
					count++
				}
			}
		}
		return x, y, count
	}

	// Try Full Multivariate
	finalPredictors := predictors
	xData, yData, validRows = getRows(finalPredictors)

	fmt.Printf("Prediction Debug: Target=%s, Candidates=%d, Feature Rows=%d\n", targetName, len(finalPredictors), validRows)

	// If Not enough rows (Underdetermined System), Fallback to BEST SINGLE PREDICTOR
	if validRows < len(finalPredictors)+1 {
		// Find best single correlation
		bestR2 := -1.0
		bestP := ""

		for _, p := range predictors {
			x, y, count := getRows([]string{p})
			if count > 2 { // Need at least 3 points for a meaningful regression (2 for line, 1 for variance)
				_, r2 := utils.MultivariateLinearRegression(y, x, count, 1)
				if r2 > bestR2 {
					bestR2 = r2
					bestP = p
				}
			}
		}

		if bestP != "" {
			finalPredictors = []string{bestP}
			xData, yData, validRows = getRows(finalPredictors)
		} else {
			return nil // No suitable predictor found even as single
		}
	}

	if validRows < len(finalPredictors)+1 { // Re-check after fallback
		return nil
	}

	// Run Regression
	coeffs, r2 := utils.MultivariateLinearRegression(yData, xData, validRows, len(finalPredictors))

	// Predict using LATEST available inputs
	var currentInputs []float64
	for _, p := range finalPredictors {
		foundVal := 0.0
		// Search backwards for latest value
		for i := len(sortedDates) - 1; i >= 0; i-- {
			d := sortedDates[i]
			if val, ok := dataMap[d][p]; ok {
				foundVal = val
				break
			}
		}
		currentInputs = append(currentInputs, foundVal)
	}

	predictedVal := utils.PredictValueMultivariate(coeffs, currentInputs)

	// Formatting response
	predictorDisplay := strings.Join(finalPredictors, " + ")
	if len(finalPredictors) > 3 {
		predictorDisplay = fmt.Sprintf("%d Variables", len(finalPredictors))
	}

	result := map[string]interface{}{
		"model_type":      "Dynamic Multivariate",
		"predictor":       predictorDisplay,
		"target":          targetName,
		"correlation":     r2,
		"current_input":   currentInputs[0], // Representative
		"predicted_value": predictedVal,
		"message":         fmt.Sprintf("Dynamic model using %s. Based on %d records.", predictorDisplay, validRows),
	}

	return result
}

func GetPredictiveAnalysis(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	lazID := getLazID(r)

	// Dynamic Prediction for Key Metrics with Strict Separation
	// Predict RHA -> Exclude ACR
	rhaPred := runPredictionHelper(lazID, "RHA", []string{"ACR"})

	// Predict ACR -> Exclude RHA
	acrPred := runPredictionHelper(lazID, "ACR", []string{"RHA"})

	resp := []map[string]interface{}{}
	if rhaPred != nil {
		resp = append(resp, rhaPred)
	}
	if acrPred != nil {
		resp = append(resp, acrPred)
	}

	// If empty (no history), return empty array
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// GetMetricTrends returns historical data series for RHA and ACR (Last 5 Years)
func GetMetricTrends(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	lazID := getLazID(r)
	if lazID == 0 {
		http.Error(w, "LAZ ID required", http.StatusBadRequest)
		return
	}

	rows, err := db.DB.Query(`
		SELECT metric_name, value, recorded_at 
		FROM metric_history 
		WHERE laz_id=$1 
		  AND (metric_name='RHA' OR metric_name='ACR') 
		  AND recorded_at >= NOW() - INTERVAL '5 years'
		ORDER BY recorded_at ASC
	`, lazID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Group by Date
	dataMap := make(map[string]map[string]float64)
	var dates []string

	for rows.Next() {
		var name string
		var val float64
		var t time.Time
		if err := rows.Scan(&name, &val, &t); err != nil {
			continue
		}
		dKey := t.Format("2006-01-02")

		if _, exists := dataMap[dKey]; !exists {
			dataMap[dKey] = make(map[string]float64)
			dates = append(dates, dKey)
		}
		dataMap[dKey][name] = val
	}

	sort.Strings(dates)

	result := []map[string]interface{}{}
	for _, d := range dates {
		rec := map[string]interface{}{"date": d}
		if v, ok := dataMap[d]["RHA"]; ok {
			rec["RHA"] = v
		}
		if v, ok := dataMap[d]["ACR"]; ok {
			rec["ACR"] = v
		}
		result = append(result, rec)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
