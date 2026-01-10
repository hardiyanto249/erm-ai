package models

import "time"

type MetricHistory struct {
	ID         int       `json:"id"`
	LazID      int       `json:"laz_id"`
	MetricName string    `json:"metric_name"`
	Value      float64   `json:"value"`
	RecordedAt time.Time `json:"recorded_at"`
}

type AnomalyResult struct {
	MetricName     string  `json:"metric_name"`
	CurrentValue   float64 `json:"current_value"`
	IsAnomaly      bool    `json:"is_anomaly"`
	NormalMean     float64 `json:"normal_mean"`
	NormalStdDev   float64 `json:"normal_std_dev"`
	ThresholdUpper float64 `json:"threshold_upper"`
	ThresholdLower float64 `json:"threshold_lower"`
	Message        string  `json:"message"`
}
