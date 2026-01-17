package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"backend/db"
)

func getLazID(r *http.Request) int {
	// 1. Check Context (Injected by AuthMiddleware)
	if val := r.Context().Value("laz_id"); val != nil {
		if id, ok := val.(int); ok {
			// If user is a specific LAZ (id > 0), they are bound to it.
			if id > 0 {
				return id
			}
			// If id == 0 (Admin), allow fallback to Query Param below for impersonation
		}
	}

	// 2. Fallback / Impersonation (Query Param)
	// Used for Admin (laz:0) to view specific LAZ data
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

func GetAllLazsForAdmin(w http.ResponseWriter, r *http.Request) {
	ctxVal := r.Context().Value("laz_id")
	if ctxVal == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if id, ok := ctxVal.(int); !ok || id != 0 {
		http.Error(w, "Forbidden: Admins only", http.StatusForbidden)
		return
	}

	partners, err := db.GetAllLazPartners()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(partners)
}

type ToggleStatusRequest struct {
	LazID    int  `json:"laz_id"`
	IsActive bool `json:"is_active"`
}

func ToggleLazStatus(w http.ResponseWriter, r *http.Request) {
	// Check Admin
	ctxVal := r.Context().Value("laz_id")
	if ctxVal == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	adminLazID, ok := ctxVal.(int)
	if !ok || adminLazID != 0 {
		http.Error(w, "Forbidden: Admins only", http.StatusForbidden)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ToggleStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if err := db.UpdateLazStatus(req.LazID, req.IsActive); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Status updated"})
}

// Config Handlers

func GetAppConfigHandler(w http.ResponseWriter, r *http.Request) {
	cfg, err := db.GetAppConfig()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cfg)
}

type UpdateConfigRequest struct {
	RhaLimit string `json:"rha_limit"`
	AcrLimit string `json:"acr_limit"`
}

func UpdateAppConfigHandler(w http.ResponseWriter, r *http.Request) {
	// Check Admin
	ctxVal := r.Context().Value("laz_id")
	if ctxVal == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if id, ok := ctxVal.(int); !ok || id != 0 {
		http.Error(w, "Forbidden: Admins only", http.StatusForbidden)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req UpdateConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.RhaLimit != "" {
		db.UpdateAppConfig("rha_limit", req.RhaLimit)
	}
	if req.AcrLimit != "" {
		db.UpdateAppConfig("acr_limit", req.AcrLimit)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Config updated"})
}
