package models

type User struct {
	ID           int    `json:"id"`
	LazID        int    `json:"laz_id"` // FK to LazPartner
	Email        string `json:"email"`
	PasswordHash string `json:"-"`
	Role         string `json:"role"` // 'Admin', 'Staff'
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token   string      `json:"token"`
	User    User        `json:"user"`
	Laz     *LazPartner `json:"laz,omitempty"` // Null if Admin (LazID=0)
	Message string      `json:"message,omitempty"`
}
