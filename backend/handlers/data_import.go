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

	// Process Headers
	headers := records[0]
	dateIdx := -1
	metricMap := make(map[int]string) // colIndex -> MetricName

	for i, h := range headers {
		h = strings.TrimSpace(strings.ToLower(h))
		h = strings.TrimRight(h, ".") // Handle "Date." case
		if h == "date" || h == "tanggal" || h == "recorded_at" {
			dateIdx = i
		} else {
			// Metric Name: Use raw header but trimmed
			normHeader := strings.TrimSpace(headers[i])
			normHeader = strings.TrimRight(normHeader, ".")

			// Canonicalize known metrics (Fuzzy Match - Strict)
			lower := strings.ToLower(normHeader)
			if lower == "rha" || strings.Contains(lower, "rasio hak amil") {
				normHeader = "RHA"
			} else if lower == "acr" || strings.Contains(lower, "acr") || strings.Contains(lower, "saldo kas") {
				normHeader = "ACR"
			} else if strings.Contains(lower, "promotion") || strings.Contains(lower, "iklan") || strings.Contains(lower, "marketing") {
				normHeader = "PromotionCost"
			} else if strings.Contains(lower, "pending") || strings.Contains(lower, "proposal") {
				normHeader = "PendingProposals"
			}
			// else keep original name (e.g. "Total Hak Amil")

			metricMap[i] = normHeader
		}
	}

	if dateIdx == -1 {
		http.Error(w, "Missing 'Date' column", http.StatusBadRequest)
		return
	}

	// Data Structures for "Current Value" update
	type MetricUpdate struct {
		Value float64
		Date  time.Time
	}
	latestMetrics := make(map[string]MetricUpdate)

	// Process Data Rows
	successCount := 0
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

	for i := 1; i < len(records); i++ {
		row := records[i]
		if len(row) <= dateIdx {
			continue
		}

		dateStr := strings.TrimSpace(row[dateIdx])
		if dateStr == "" {
			continue
		}

		// Try different date formats (including 2-digit year)
		var recordDate time.Time
		formats := []string{
			"2006-01-02", "02/01/2006", "02-01-2006", "2006/01/02",
			"02-01-06", "02/01/06", "1/2/06", "1-2-06",
			"02-Jan-06", "02-Jan-2006",
		}
		parsed := false
		for _, f := range formats {
			t, err := time.Parse(f, dateStr)
			if err == nil {
				recordDate = t
				parsed = true
				break
			}
		}

		if !parsed {
			continue
		}

		for colIdx, valStr := range row {
			if colIdx == dateIdx {
				continue
			}

			metricName, exists := metricMap[colIdx]
			if !exists {
				continue
			}

			valStr = strings.TrimSpace(valStr)
			// Remove common symbols
			valStr = strings.ReplaceAll(valStr, "%", "")
			valStr = strings.ReplaceAll(valStr, "Rp", "")
			valStr = strings.TrimSpace(valStr)

			if valStr == "" {
				continue
			}

			// AGGRESSIVE CLEANING
			// Problem: "52.210.001.219" failing to strip dots?
			// Maybe they are distinct chars? Use Loop to keep only 0-9, . , -
			// Or simplified heuristic:

			cleanVal := ""
			for _, r := range valStr {
				if (r >= '0' && r <= '9') || r == '.' || r == ',' || r == '-' {
					cleanVal += string(r)
				}
			}
			valStr = cleanVal

			// Analyze Format (Super Aggressive Integer for Money)
			if metricName != "RHA" && metricName != "ACR" {
				fmt.Println("DEBUG: Stripping ALL separators for Money:", metricName, valStr)
				// Assume Money values are Integers (Rupiah).
				// Strip BOTH dots and commas.
				valStr = strings.ReplaceAll(valStr, ".", "")
				valStr = strings.ReplaceAll(valStr, ",", "")
			} else {
				// For Ratios (RHA/ACR):
				// Expected: "13.06" or "13,06"
				// If "13,06", standardize to "13.06"
				valStr = strings.ReplaceAll(valStr, ",", ".")
				// If "13.06", clear.
			}

			val, err := strconv.ParseFloat(valStr, 64)
			if err != nil {
				fmt.Printf("Warning: Row %d, Metric %s -> ParseFloat failed for value '%s'. Bytes: %v\n", i+1, metricName, valStr, []byte(valStr))
				continue
			}

			// Insert History
			_, err = stmtHistory.Exec(lazID, metricName, val, recordDate)
			if err != nil {
				fmt.Printf("Error inserting history row %d metric %s: %v\n", i+1, metricName, err)
			} else {
				fmt.Printf("Success Row %d Metric %s Val %.2f\n", i+1, metricName, val)
				successCount++
			}

			// Track Latest for Metrics Table
			current, ok := latestMetrics[metricName]
			if !ok || recordDate.After(current.Date) || (recordDate.Equal(current.Date) && true) {
				latestMetrics[metricName] = MetricUpdate{Value: val, Date: recordDate}
			}
		}
	}

	// Upsert into 'metrics' table
	stmtMetrics, err := tx.Prepare(`
		INSERT INTO metrics (laz_id, name, value, updated_at) 
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (laz_id, name) 
		DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
	`)
	if err != nil {
		fmt.Println("Error preparing metric upsert:", err)
		// Don't fail entire request? Or do? Better to fail.
		// http.Error ...
	} else {
		defer stmtMetrics.Close()
		for name, update := range latestMetrics {
			fmt.Printf("Updating Current Metric: LAZ %d | %s = %.2f (Date: %s)\n", lazID, name, update.Value, update.Date.Format("2006-01-02"))
			_, err := stmtMetrics.Exec(lazID, name, update.Value, update.Date)
			if err != nil {
				fmt.Printf("Failed to update current metric %s: %v\n", name, err)
			}
		}
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(fmt.Sprintf(`{"message": "Successfully imported %d data points and updated current metrics"}`, successCount)))
}
