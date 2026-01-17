package handlers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"backend/db"

	"github.com/xuri/excelize/v2"
)

// ImportHistoricalData handles CSV and Excel uploads to populate metric_history
// AND updates the current 'metrics' table with the latest values found.
func ImportHistoricalData(w http.ResponseWriter, r *http.Request) {
	lazID := getLazID(r)
	if lazID == 0 {
		http.Error(w, "Unauthorized: No LAZ ID found", http.StatusUnauthorized)
		return
	}

	// limit to 10MB
	r.ParseMultipartForm(10 << 20)

	file, handler, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Error retrieving file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(handler.Filename))

	var records [][]string

	if ext == ".csv" {
		reader := csv.NewReader(file)
		records, err = reader.ReadAll()
		if err != nil {
			http.Error(w, "Failed to parse CSV", http.StatusBadRequest)
			return
		}
	} else if ext == ".xlsx" {
		f, err := excelize.OpenReader(file)
		if err != nil {
			http.Error(w, "Failed to parse Excel file", http.StatusBadRequest)
			return
		}
		defer f.Close()

		// Get all rows in the first Sheet (default)
		sheetName := f.GetSheetList()[0]
		rows, err := f.GetRows(sheetName)
		if err != nil {
			http.Error(w, "Failed to get rows from Excel", http.StatusBadRequest)
			return
		}
		records = rows
	} else {
		http.Error(w, "Unsupported file format. Use .csv or .xlsx", http.StatusBadRequest)
		return
	}

	if len(records) < 2 {
		http.Error(w, "File is empty or missing headers", http.StatusBadRequest)
		return
	}

	// Process Headers to detect Format
	headers := records[0]
	headerMap := make(map[string]int)
	for i, h := range headers {
		headerMap[strings.TrimSpace(strings.ToLower(h))] = i
	}

	// Detection
	isLongFormat := false
	// Name check
	nameExists := false
	if _, ok := headerMap["name"]; ok {
		nameExists = true
	}
	if _, ok := headerMap["item"]; ok {
		nameExists = true
	}

	if nameExists {
		if _, ok2 := headerMap["kind"]; ok2 {
			if _, ok3 := headerMap["value"]; ok3 {
				isLongFormat = true
			}
		}
	}

	// Data Structures
	type MetricUpdate struct {
		Value       float64
		Date        time.Time
		IsPredictor bool
	}
	latestMetrics := make(map[string]MetricUpdate)

	// DB Transaction
	tx, err := db.DB.Begin()
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	stmtHistory, err := tx.Prepare("INSERT INTO metric_history (laz_id, metric_name, value, recorded_at) VALUES ($1, $2, $3, $4)")
	if err != nil {
		http.Error(w, "Database preparation error", http.StatusInternalServerError)
		return
	}
	defer stmtHistory.Close()

	successCount := 0

	// Helper to Parse Date
	parseDate := func(dateStr string) (time.Time, bool) {
		formats := []string{
			"2006-01-02", "02/01/2006", "02-01-2006", "2006/01/02",
			"02-01-06", "02/01/06", "1/2/06", "1-2-06",
			"02-Jan-06", "02-Jan-2006",
		}
		for _, f := range formats {
			t, err := time.Parse(f, dateStr)
			if err == nil {
				return t, true
			}
		}
		return time.Time{}, false
	}

	// Helper to Clean/Parse Value
	parseValue := func(valStr string) (float64, error) {
		valStr = strings.TrimSpace(valStr)
		if valStr == "" {
			return 0, fmt.Errorf("empty")
		}
		// Handle Percent and Currency cleaning
		isPercent := strings.Contains(valStr, "%")
		valStr = strings.ReplaceAll(valStr, "%", "")
		valStr = strings.ReplaceAll(valStr, "Rp", "")
		valStr = strings.TrimSpace(valStr)

		// Heuristic: If contains comma and dot, assume dot is thousand separator (indo/euro) if occurring earlier or multiple times?
		// User Example: "52,210,001,219" (Comma is Thousand) -> "52210001219"
		// User Example: "13,06" (Comma is Decimal?) -> "13.06"
		// Context dependent!
		// Logic:
		// 1. If multiple commas and no dots -> Commas are thousands.
		// 2. If 1 comma and it's at end (2 digits), likely decimal?
		// 3. If "kind" says "RHA" or % is present -> Expect decimal.

		// ROBUST CLEANER:
		// Remove all non-digits, commas, dots, minus.
		cleanVal := ""
		for _, r := range valStr {
			if (r >= '0' && r <= '9') || r == '.' || r == ',' || r == '-' {
				cleanVal += string(r)
			}
		}
		valStr = cleanVal

		// If isPercent: "13,06" -> "13.06"
		if isPercent {
			valStr = strings.ReplaceAll(valStr, ",", ".")
		} else {
			// Big Number assumption
			if strings.Count(valStr, ",") > 1 {
				// "52,210,001,219" -> Remove commas
				valStr = strings.ReplaceAll(valStr, ",", "")
			} else if strings.Count(valStr, ".") > 1 {
				// "52.210.001.219" -> Remove dots
				valStr = strings.ReplaceAll(valStr, ".", "")
			} else {
				// Ambiguous "123,456" -> Could be 123k or 123.456
				// Default to standard float parse (dot is decimal).
				// But user image "13,06%" suggests comma is decimal.
				// "52,210..." suggests comma is thousand.
				// This is contradictory in standard locale.
				// Let's assume: If it looks like integer (formatted with thousand sep), treat as int.
				// Comma as decimal usually implies Dot as thousand.
				// User image has Comma as Thousand (52,210...) AND Comma as Decimal (13,06).
				// Wait, "13,06" in image -> "Kind: RHA".
				// "52,210,001,219" -> "Kind: Non Predictor".
				// Maybe the App viewing the CSV (Excel) is rendering it?
				// Raw CSV text: "31/12/2024,RHA,RHA,\"13,06%\"" vs "31/12/2024,Total...,Non...,\"52,210,001,219\""
				// Excel often localizes display.
				// Safest bet: Try parsing with dot as decimal first. If fails or weird, try other.
				// Actually, just stripping "," if count > 0 is risky for "13,06".
				// Correct Logic based on observation:
				// If Value contains "%", treat comma as decimal.
				// Else, remove commas (assume thousand sep).
				if strings.Contains(valStr, ",") && isPercent {
					valStr = strings.ReplaceAll(valStr, ",", ".")
				} else {
					valStr = strings.ReplaceAll(valStr, ",", "")
				}
			}
		}

		return strconv.ParseFloat(valStr, 64)
	}

	if isLongFormat {
		fmt.Println("Processing Long Format upload...")
		// Indices
		dateIdx := headerMap["date"]
		if _, ok := headerMap["date"]; !ok {
			if idx, ok := headerMap["tanggal"]; ok {
				dateIdx = idx
			}
		}
		nameIdx := headerMap["name"]
		if _, ok := headerMap["name"]; !ok {
			if idx, ok := headerMap["item"]; ok {
				nameIdx = idx
			}
		}
		kindIdx := headerMap["kind"]
		valIdx := headerMap["value"]

		for i := 1; i < len(records); i++ {
			row := records[i]
			if len(row) <= valIdx {
				continue
			}

			dateStr := row[dateIdx]
			metricName := strings.TrimSpace(row[nameIdx])

			// Canonicalize Name
			lowerName := strings.ToLower(metricName)
			if lowerName == "rha" || strings.Contains(lowerName, "rasio hak amil") {
				metricName = "RHA"
			} else if lowerName == "acr" || strings.Contains(lowerName, "acr") || strings.Contains(lowerName, "saldo kas") {
				metricName = "ACR"
			} else if strings.Contains(lowerName, "promotion") || strings.Contains(lowerName, "iklan") || strings.Contains(lowerName, "marketing") {
				metricName = "PromotionCost"
			} else if strings.Contains(lowerName, "pending") || strings.Contains(lowerName, "proposal") {
				metricName = "PendingProposals"
			}

			kindStr := strings.TrimSpace(row[kindIdx])
			valStr := row[valIdx]

			date, ok := parseDate(dateStr)
			if !ok {
				continue
			}

			val, err := parseValue(valStr)
			if err != nil {
				continue
			}

			// Insert History
			if _, err := stmtHistory.Exec(lazID, metricName, val, date); err != nil {
				continue
			}
			successCount++

			// isPredictor logic
			isPred := strings.EqualFold(kindStr, "Predictor")

			// Update Latest
			current, ok := latestMetrics[metricName]
			if !ok || date.After(current.Date) {
				latestMetrics[metricName] = MetricUpdate{Value: val, Date: date, IsPredictor: isPred}
			}
		}

	} else {
		// Existing Wide Format Logic (simplified/cleaned)
		fmt.Println("Processing Wide Format upload...")
		dateIdx := -1
		colMap := make(map[int]string)

		for i, h := range headers {
			lower := strings.TrimSpace(strings.ToLower(h))
			// Skip metadata columns in Wide Format
			if lower == "item" || lower == "kind" || lower == "kategori" || lower == "nama" {
				continue
			}

			if lower == "date" || lower == "tanggal" || lower == "recorded_at" {
				dateIdx = i
			} else {
				// Normalize Name
				if lower == "rha" || strings.Contains(lower, "rasio hak amil") {
					colMap[i] = "RHA"
				} else if lower == "acr" || strings.Contains(lower, "acr") || strings.Contains(lower, "saldo kas") {
					colMap[i] = "ACR"
				} else if strings.Contains(lower, "promotion") || strings.Contains(lower, "iklan") || strings.Contains(lower, "marketing") {
					colMap[i] = "PromotionCost"
				} else if strings.Contains(lower, "pending") || strings.Contains(lower, "proposal") {
					colMap[i] = "PendingProposals"
				} else {
					colMap[i] = strings.TrimSpace(headers[i])
				}
			}
		}

		if dateIdx == -1 {
			http.Error(w, "Missing 'Date' column", http.StatusBadRequest)
			return
		}

		for i := 1; i < len(records); i++ {
			row := records[i]
			if len(row) <= dateIdx {
				continue
			}

			date, ok := parseDate(row[dateIdx])
			if !ok {
				fmt.Printf("Skipping row %d: Invalid Date '%s'\n", i, row[dateIdx])
				continue
			}

			for colIdx, valStr := range row {
				if colIdx == dateIdx {
					continue
				}
				name, exists := colMap[colIdx]
				if !exists {
					continue
				}

				val, err := parseValue(valStr)
				if err != nil {
					fmt.Printf("Skipping row %d metric %s: Invalid Value '%s'\n", i, name, valStr)
					continue
				}

				stmtHistory.Exec(lazID, name, val, date)
				successCount++

				// Default true for legacy wide format
				isPred := true
				if name == "RHA" || name == "ACR" {
					isPred = false
				} // Targets aren't predictors

				current, ok := latestMetrics[name]
				if !ok || date.After(current.Date) {
					latestMetrics[name] = MetricUpdate{Value: val, Date: date, IsPredictor: isPred}
				}
			}
		}
	}

	// Upsert metrics with is_predictor
	stmtMetrics, err := tx.Prepare(`
		INSERT INTO metrics (laz_id, name, value, updated_at, is_predictor) 
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (laz_id, name) 
		DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at, is_predictor = EXCLUDED.is_predictor
	`)
	if err != nil {
		fmt.Println("Error preparing metric upsert:", err)
	} else {
		defer stmtMetrics.Close()
		for name, update := range latestMetrics {
			stmtMetrics.Exec(lazID, name, update.Value, update.Date, update.IsPredictor)
		}
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(fmt.Sprintf(`{"message": "Successfully imported %d data points"}`, successCount)))
}
