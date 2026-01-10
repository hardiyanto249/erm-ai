package middleware

import (
	"backend/db"
	"backend/utils"
	"context"
	"net/http"
)

// type contextKey string
const LazIDKey = "laz_id"

// AuthMiddleware validates the X-LAZ-Token header
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("X-LAZ-Token")
		if token == "" {
			// For backward compatibility during migration, if NO token is present,
			// we MIGHT check for query param or default to 1, but for strict security per request:
			// We return 401 Unauthorized.
			// HOWEVER, to keep the current frontend working until we update it,
			// let's allow a fallback if it's a "public" GET request or temporary dev mode?
			// NO, per user request: "Secret, only they can input". We enforce it.
			http.Error(w, "Missing Authentication Token", http.StatusUnauthorized)
			return
		}

		// Hash the token to compare with DB
		tokenHash := utils.HashToken(token)

		// Find LAZ by token hash
		// We need a DB function for this.
		lazID, err := db.GetLazIDByToken(tokenHash)
		if err != nil || lazID == 0 {
			http.Error(w, "Invalid Authentication Token", http.StatusUnauthorized)
			return
		}

		// Inject lazID into context
		ctx := context.WithValue(r.Context(), LazIDKey, lazID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
