package models

type Risk struct {
	ID                 string `json:"id"`
	Description        string `json:"description"`
	Category           string `json:"category"`
	Impact             string `json:"impact"`
	Likelihood         string `json:"likelihood"`
	Status             string `json:"status"`
	LazID              int    `json:"laz_id"`
	MitigationPlan     string `json:"mitigation_plan"`
	MitigationStatus   string `json:"mitigation_status"`
	MitigationProgress int    `json:"mitigation_progress"`
	Context            string  `json:"context,omitempty"` // New Field: Project/Event Name
	ConfidenceScore    float64 `json:"confidence_score,omitempty"`
	Reasoning          string  `json:"reasoning,omitempty"`
	CreatedAt          string  `json:"created_at"`
}

type GeneratedRisk struct {
	ID                  string  `json:"id"`
	Category            string  `json:"category"`
	Description         string  `json:"description"`
	Impact              string  `json:"impact"`
	Likelihood          string  `json:"likelihood"`
	Status              string  `json:"status"`
	ConfidenceScore     float64 `json:"confidenceScore"`
	ViolationType       string  `json:"violationType"`
	Reasoning           string  `json:"reasoning"`
	SuggestedMitigation string  `json:"suggestedMitigation"`
	Context             string  `json:"context,omitempty"` // New Field
}
