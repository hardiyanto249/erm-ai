package middleware

import (
	"context"
	"net/http"
	"strconv"
	"strings"
)

// type contextKey string
const LazIDKey = "laz_id"

// AuthMiddleware validates the X-LAZ-Token header
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("X-LAZ-Token")
		if token == "" {
			http.Error(w, "Missing Authentication Token", http.StatusUnauthorized)
			return
		}

		// STRATEGY CHANGE: Simple "laz:<id>" token for MVP Login
		// Real production should use JWT (Bearer token)

		// 1. Check if token starts with "laz:"
		if !strings.HasPrefix(token, "laz:") {
			http.Error(w, "Invalid Token Format", http.StatusUnauthorized)
			return
		}

		// Extract ID string
		idStr := strings.TrimPrefix(token, "laz:")
		if idStr == "" {
			http.Error(w, "Invalid Token Format: Missing LAZ ID", http.StatusUnauthorized)
			return
		}

		// Convert ID string to int
		lazID, err := strconv.Atoi(idStr)
		if err != nil {
			http.Error(w, "Invalid Token Format: LAZ ID is not a number", http.StatusUnauthorized)
			return
		}

		// For MVP, we trust the provided lazID.
		// In a real app, we might verify this lazID against a database
		// or ensure it's a valid, active LAZ.
		// For now, just setting it in context.

		// Inject lazID into context
		ctx := context.WithValue(r.Context(), LazIDKey, lazID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
