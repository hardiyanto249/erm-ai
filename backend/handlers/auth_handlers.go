package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"backend/db"
	"backend/models"

	"golang.org/x/crypto/bcrypt"
)

// Modified Register Request to include User Info
type RegisterRequest struct {
	// LAZ Info
	LazName        string `json:"laz_name"`
	LazScale       string `json:"laz_scale"`
	LazDescription string `json:"laz_description"`
	// Admin User Info
	Email    string `json:"email"`
	Password string `json:"password"`
}

func Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// 1. Get User
	user, err := db.GetUserByEmail(req.Email)
	if err != nil {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	// 2. Compare Password
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	// 3. Generate Session Token (Simplest: "laz:<ID>")
	// We use this because AuthMiddleware is updated to accept "laz:<ID>"
	token := "laz:" + strconv.Itoa(user.LazID)
	// We need strconv import in auth_handlers.go if not present.
	// Wait, let's look at existing imports in auth_handlers.go
	// It has: encoding/json, net/http, strings, backend/db, backend/models, golang.org/x/crypto/bcrypt
	// I need to add strconv.

	var laz models.LazPartner
	if user.LazID > 0 {
		laz, _ = db.GetLazByID(user.LazID)
		if !laz.IsActive {
			http.Error(w, "Account is disabled. Contact Administrator.", http.StatusForbidden)
			return
		}
	}

	resp := models.LoginResponse{
		Token:   token,
		User:    user,
		Message: "Login successful",
	}
	if user.LazID > 0 {
		resp.Laz = &laz
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

func RegisterLazAndAdmin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// 1. Create LAZ
	lazID, err := db.CreateLazPartner(req.LazName, req.LazScale, req.LazDescription)
	if err != nil {
		http.Error(w, "Failed to create LAZ: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 2. Hash Password
	hashedPwd, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}

	// 3. Create Admin User for this LAZ
	// Role 'Admin' implies LAZ Admin. System Admin would have LazID=0.
	err = db.CreateUser(req.Email, string(hashedPwd), "Admin", lazID)
	if err != nil {
		http.Error(w, "Failed to create user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "LAZ and Admin account registered successfully",
		"laz_id":  lazID,
		"email":   req.Email,
	})
}
