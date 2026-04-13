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
		// Admin Console viewing nothing
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("{}"))
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
	// 1. Fetch All Data for valid variables
	// === ROLLING WINDOW: Hanya gunakan data 5 tahun terakhir ===
	rows, err := db.DB.Query(`
		SELECT metric_name, value, recorded_at 
		FROM metric_history 
		WHERE laz_id=$1 
		  AND recorded_at >= NOW() - INTERVAL '5 years'
		ORDER BY recorded_at ASC`, lazID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	// Pivot: date -> metric -> value
	dataMap := make(map[string]map[string]float64)
	allMetrics := make(map[string]bool)

	// Track date range for display
	var minDate, maxDate string

	for rows.Next() {
		var name string
		var val float64
		var date time.Time
		if err := rows.Scan(&name, &val, &date); err != nil {
			continue
		}
		dKey := date.Format("2006-01-02")

		if minDate == "" || dKey < minDate {
			minDate = dKey
		}
		if dKey > maxDate {
			maxDate = dKey
		}

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

	// 0. Get Allowed Predictors from Metadata
	allowedPredictors := make(map[string]bool)
	pmRows, err := db.DB.Query("SELECT name FROM metrics WHERE laz_id=$1 AND is_predictor=true", lazID)
	if err == nil {
		defer pmRows.Close()
		for pmRows.Next() {
			var n string
			pmRows.Scan(&n)
			allowedPredictors[n] = true
		}
	}

	// Identify Predictors: All metrics EXCEPT the target AND excluded ones AND must be allowed
	var predictors []string
	for m := range allMetrics {
		if !isExcluded(m) && allowedPredictors[m] {
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
	var predictedVal, r2 float64
	var coeffs []float64

	finalPredictors := predictors
	xData, yData, validRows = getRows(finalPredictors)

	fmt.Printf("Prediction Debug: Target=%s, Candidates=%d, Names=%v, Feature Rows=%d\n", targetName, len(finalPredictors), finalPredictors, validRows)

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
			// Do NOT return nil here. Let it fall through to Time-Series.
			fmt.Println("Dynamic Prediction: No single strong predictor found. Falling through to Time-Series.")
		}
	}

	// If Not enough rows for Multivariate (or Single fallback failed), Try TIME-SERIES Prediction
	if validRows < len(finalPredictors)+1 {
		fmt.Printf("Dynamic Prediction Failed (Rows=%d). Attempting Time-Series Trend Fallback...\n", validRows)

		// Build Time Series Data
		var timeX, valY []float64
		var lastDate time.Time

		// Fetch only target history
		tRows, err := db.DB.Query("SELECT value, recorded_at FROM metric_history WHERE laz_id=$1 AND metric_name=$2 ORDER BY recorded_at ASC", lazID, targetName)
		if err == nil {
			defer tRows.Close()
			for tRows.Next() {
				var v float64
				var t time.Time
				if err := tRows.Scan(&v, &t); err == nil {
					timeX = append(timeX, float64(t.Unix())) // Use Unix timestamp as X
					valY = append(valY, v)
					lastDate = t
				}
			}
		}

		if len(timeX) > 1 {
			// Simple Regression: Y = a + b*Time
			slope, intercept, _ := utils.SimpleLinearRegression(timeX, valY)

			// Predict for Next Month (approx 30 days from last record, or just "now" if data is old)
			// User generally wants to know "Where is it heading?".
			// If last record is today, predict next month.
			targetTime := lastDate.AddDate(0, 1, 0).Unix() // Next Month
			predictedVal = utils.PredictValueSimple(slope, intercept, float64(targetTime))

			r2 = 0.5 // Dummy confidence for trend line? Or calculate? utils.Simple doesn't return R2 yet.

			explanation := "Prediksi berbasis Tren Waktu (Time-Series) karena data prediktor eksternal belum lengkap/sinkron."

			result := map[string]interface{}{
				"model_type":      "Time-Series Trend",
				"predictor":       "Time (Trend)",
				"target":          targetName,
				"correlation":     0.0, // Not applicable or low confidence
				"current_input":   0,   // Time input doesn't make sense to show as currency
				"predicted_value": predictedVal,
				"message":         explanation,
			}
			return result
		}

		// return nil // Truly no data
		explanation := "Data historis tidak cukup (butuh min. 2 periode)."
		result := map[string]interface{}{
			"model_type":      "Insufficient Data",
			"predictor":       "-",
			"target":          targetName,
			"correlation":     0.0,
			"current_input":   0,
			"predicted_value": 0,
			"message":         explanation,
		}
		return result
	}

	// Run Regression
	coeffs, r2 = utils.MultivariateLinearRegression(yData, xData, validRows, len(finalPredictors))

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

	predictedVal = utils.PredictValueMultivariate(coeffs, currentInputs)

	// Formatting response
	predictorDisplay := strings.Join(finalPredictors, " + ")

	explanation := fmt.Sprintf("Model multivariat menganalisis %d variabel prediktor sekaligus.", len(finalPredictors))
	if len(finalPredictors) < len(predictors) {
		explanation = fmt.Sprintf("Data historis terbatas (%d record). Sistem mensimplifikasi model menggunakan 1 prediktor paling dominan (%s) untuk akurasi terbaik.", validRows, predictorDisplay)
	}

	result := map[string]interface{}{
		"model_type":      "Dynamic Multivariate",
		"predictor":       predictorDisplay,
		"target":          targetName,
		"correlation":     r2,
		"current_input":   currentInputs[0], // Representative value
		"predicted_value": predictedVal,
		"coefficients":    coeffs,
		"message":         explanation,
		"data_from":       minDate,
		"data_to":         maxDate,
		"window":          "5 tahun terakhir",
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
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("[]"))
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

// GetBenchmarkMetrics calculates the average RHA and ACR of all OTHER LAZs (market avg)
func GetBenchmarkMetrics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	lazID := getLazID(r)
	if lazID == 0 {
		// Return 0s so chart is just empty
		result := map[string]float64{"avg_RHA": 0, "avg_ACR": 0}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
		return
	}

	// Query Average RHA and ACR excluding current LAZ AND Disabled LAZs
	query := `
		SELECT m.name, AVG(m.value)
		FROM metrics m
		JOIN laz_partners l ON m.laz_id = l.id
		WHERE m.laz_id != $1 
		  AND m.name IN ('RHA', 'ACR')
		  AND COALESCE(l.is_active, TRUE) = TRUE
		GROUP BY m.name
	`
	rows, err := db.DB.Query(query, lazID)
	if err != nil {
		fmt.Println("Benchmark Error:", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	result := map[string]float64{
		"avg_RHA": 0,
		"avg_ACR": 0,
	}

	for rows.Next() {
		var name string
		var val float64
		if err := rows.Scan(&name, &val); err == nil {
			if name == "RHA" {
				result["avg_RHA"] = val
			}
			if name == "ACR" {
				result["avg_ACR"] = val
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
