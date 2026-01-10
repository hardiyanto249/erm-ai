package utils

import (
	"log"
	"math"

	"backend/db"
	"backend/models"
)

// DetectAnomaly performs a simplified anomaly detection using Z-Score / Statistical Process Control (SPC).
// It acts as a "Smoke Detector" by calculating the "Normal Operating Range" (Heartbeat) of the specific LAZ
// based on its last N historical data points.
// Deviation > 2 * StdDev is flagged as an anomaly.
func DetectAnomaly(lazID int, metricName string, currentValue float64) models.AnomalyResult {
	// 1. Fetch History (Last 30 entries)
	rows, err := db.DB.Query("SELECT value FROM metric_history WHERE laz_id=$1 AND metric_name=$2 ORDER BY recorded_at DESC LIMIT 30", lazID, metricName)
	if err != nil {
		log.Println("Error fetching history for anomaly detection:", err)
		return models.AnomalyResult{IsAnomaly: false, Message: "Insufficient Data"}
	}
	defer rows.Close()

	var values []float64
	for rows.Next() {
		var v float64
		rows.Scan(&v)
		values = append(values, v)
	}

	if len(values) < 5 {
		// Not enough data to establish a baseline
		return models.AnomalyResult{IsAnomaly: false, Message: "Learning... (Need more data)"}
	}

	// 2. Calculate Mean (Average Heartbeat)
	var sum float64
	for _, v := range values {
		sum += v
	}
	mean := sum / float64(len(values))

	// 3. Calculate Standard Deviation (Volatility)
	var varianceSum float64
	for _, v := range values {
		varianceSum += math.Pow(v-mean, 2)
	}
	stdDev := math.Sqrt(varianceSum / float64(len(values)))

	// 4. Define Dynamic Thresholds (The "Smoke Detector" Sensitivity)
	// We use 2.0 Sigma (approx 95% confidence interval)
	sensitivity := 2.0
	// Ensure a minimum floor for stdDev to avoid over-sensitivity on flat lines
	if stdDev < 0.1 {
		stdDev = 0.1
	}

	upperBound := mean + (sensitivity * stdDev)
	lowerBound := mean - (sensitivity * stdDev)

	isAnomaly := currentValue > upperBound || currentValue < lowerBound

	msg := "Normal Operation"
	if isAnomaly {
		msg = "⚠️ Anomaly Detected: Abnormal deviation from historical pattern."
	}

	return models.AnomalyResult{
		MetricName:     metricName,
		CurrentValue:   currentValue,
		IsAnomaly:      isAnomaly,
		NormalMean:     mean,
		NormalStdDev:   stdDev,
		ThresholdUpper: upperBound,
		ThresholdLower: lowerBound,
		Message:        msg,
	}
}
