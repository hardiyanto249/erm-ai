package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"backend/db"
)

func getLazID(r *http.Request) int {
	// 1. Check Context (Injected by AuthMiddleware)
	// We use string key if contextKey isn't exported, but better to import middleware or define shared key
	// For simplicity, we assume "laz_id" string key was used or we cast.
	// Ideally, we'd import middleware.LazIDKey but cycle imports are bad.
	// Let's use the string "laz_id"
	if val := r.Context().Value("laz_id"); val != nil {
		if id, ok := val.(int); ok {
			return id
		}
	}

	// 2. TEMPORARY FALLBACK for Dev/Legacy Frontend compatibility
	// Check Query Param
	lazIDStr := r.URL.Query().Get("laz_id")
	if lazIDStr != "" {
		if id, err := strconv.Atoi(lazIDStr); err == nil {
			return id
		}
	}
	// 3. Return 0 if identity not found (Caller must handle)
	return 0
}

func GetLazPartners(w http.ResponseWriter, r *http.Request) {
	partners, err := db.GetLazPartners()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(partners)
}
