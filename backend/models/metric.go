package models

type Metric struct {
	LazID     int     `json:"laz_id"`
	Name      string  `json:"name"`
	Value     float64 `json:"value"`
	UpdatedAt string  `json:"updated_at"`
}
