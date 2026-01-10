package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"

	"backend/db"
	"backend/utils"
)

type RegisterRequest struct {
	Name        string `json:"name"`
	Scale       string `json:"scale"`
	Description string `json:"description"`
}

type RegisterResponse struct {
	LazID    int    `json:"laz_id"`
	ApiToken string `json:"api_token"`
	Message  string `json:"message"`
}

func generateToken() (string, error) {
	bytes := make([]byte, 16) // 16 bytes = 32 hex chars
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return "laz_" + hex.EncodeToString(bytes), nil
}

func RegisterLaz(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// 1. Generate Token
	token, err := generateToken()
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	// 2. Hash Token
	tokenHash := utils.HashToken(token)

	// 3. Save to DB
	id, err := db.CreateLazPartner(req.Name, req.Scale, req.Description, tokenHash)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 4. Return Raw Token (Once)
	resp := RegisterResponse{
		LazID:    id,
		ApiToken: token,
		Message:  "PENTING: Simpan token ini baik-baik. Token ini tidak akan ditampilkan lagi.",
	}
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(resp)
}
