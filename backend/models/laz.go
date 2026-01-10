package models

type LazPartner struct {
	ID           int    `json:"id"`
	Name         string `json:"name"`
	Scale        string `json:"scale"`
	Description  string `json:"description"`
	ApiTokenHash string `json:"-"` // Never output this in JSON
}
