package handlers

import (
	"encoding/json"
	"net/http"

	"backend/db"
	"backend/models"
)

func GetComplianceItems(w http.ResponseWriter, r *http.Request) {
	lazID := getLazID(r)
	items, err := db.GetComplianceItems(lazID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(items)
}

func AddComplianceItem(w http.ResponseWriter, r *http.Request) {
	lazID := getLazID(r)
	var item models.ComplianceItem
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	item.LazID = lazID
	if err := db.AddComplianceItem(item); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

func ToggleComplianceItem(w http.ResponseWriter, r *http.Request) {
	lazID := getLazID(r)
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "Missing id", http.StatusBadRequest)
		return
	}
	if err := db.ToggleComplianceItem(id, lazID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func GetZisData(w http.ResponseWriter, r *http.Request) {
	lazID := getLazID(r)
	data, err := db.GetZisData(lazID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}
