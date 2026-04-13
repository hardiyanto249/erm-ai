package main

import (
	"log"
	"net/http"
	"os"

	"backend/config"
	"backend/db"
	"backend/handlers"
	"backend/middleware"
	"backend/services"

	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

func main() {
	// Load environment variables from .env
	if err := godotenv.Load(); err != nil {
		log.Println("ℹ️ No .env file found, using system environment variables")
	}

	// Load Config
	cfg := config.Load()

	// Init AI Service
	geminiSvc, err := services.NewGeminiService(cfg)
	if err != nil {
		log.Printf("⚠️ Warning: Failed to init Gemini Service: %v", err)
	}

	// Inject into handlers
	handlers.GeminiSvc = geminiSvc
	handlers.PromptCfg = cfg.PromptCfg

	// Default to a local connection string if not set
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgres://postgres:postgres@localhost:5432/erm_ziswaf?sslmode=disable"
	}
	db.InitDB(connStr)

	// Ensure tables exist
	db.CreateTables()
	db.CreateExtendedTables()

	db.SeedRisks()
	db.SeedExtendedData()
	db.SeedMetrics()
	db.SeedHistoryIfEmpty()
	db.SeedLeadingIndicators()
	db.SeedAdmin() // Initialize Default Admin

	mux := http.NewServeMux()

	// Public Routes
	mux.HandleFunc("/api/auth/register", handlers.RegisterLazAndAdmin)
	mux.HandleFunc("/api/auth/login", handlers.Login)

	// Protected Routes (Wrapped in Middleware)
	// Note: For now we apply middleware locally or global?
	// Let's create a protectedMux or just wrap specific handlers

	// Helper to wrap
	protected := func(h http.HandlerFunc) http.HandlerFunc {
		return middleware.AuthMiddleware(h).ServeHTTP
	}

	mux.HandleFunc("/api/metrics", protected(handlers.GetMetrics))
	mux.HandleFunc("/api/lazs", handlers.GetLazPartners)                      // Public to see list? Or protected? Let's keep public for drop down login
	mux.HandleFunc("/api/admin/lazs", protected(handlers.GetAllLazsForAdmin)) // Protected Admin Route to see All
	mux.HandleFunc("/api/lazs/toggle-status", protected(handlers.ToggleLazStatus))
	mux.HandleFunc("/api/config", protected(handlers.GetAppConfigHandler))
	mux.HandleFunc("/api/admin/config/update", protected(handlers.UpdateAppConfigHandler))

	mux.HandleFunc("/api/compliance", protected(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handlers.GetComplianceItems(w, r)
		case http.MethodPost:
			handlers.AddComplianceItem(w, r)
		case http.MethodPut:
			handlers.ToggleComplianceItem(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	mux.HandleFunc("/api/zis", protected(handlers.GetZisData))
	mux.HandleFunc("/api/analytics/anomaly", protected(handlers.GetAnomalyCheck))             // New Endpoint
	mux.HandleFunc("/api/analytics/prediction", protected(handlers.GetPredictiveAnalysis))    // Model B Endpoint
	mux.HandleFunc("/api/analytics/trends", protected(handlers.GetMetricTrends))              // NEW: Metric Trends (5 Years)
	mux.HandleFunc("/api/analytics/benchmark", protected(handlers.GetBenchmarkMetrics))       // NEW: Benchmark Avg
	mux.HandleFunc("/api/analytics/upload-history", protected(handlers.ImportHistoricalData)) // NEW: Upload History
	mux.HandleFunc("/api/generate-risks", protected(handlers.GenerateRisks))                  // NEW: AI Risk Gen
	mux.HandleFunc("/api/reports/risk-register", protected(handlers.GenerateRiskReport))      // NEW: PDF Report
	mux.HandleFunc("/api/integration/finance-sync", handlers.SyncFinanceData)                 // External S2S Endpoint (No User Token, uses API Key)

	mux.HandleFunc("/api/risks", protected(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handlers.GetRisks(w, r)
		case http.MethodPost:
			handlers.CreateRisk(w, r)
		case http.MethodPut:
			handlers.UpdateRisk(w, r)
		case http.MethodDelete:
			handlers.DeleteRisk(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	// CORS
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"https://erm-ai.centonk.my.id", "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE"},
		AllowedHeaders:   []string{"Content-Type", "X-LAZ-Token"}, // Add X-LAZ-Token
		AllowCredentials: true,
	})

	handler := c.Handler(mux)

	// Serve Static Files (Frontend)
	fs := http.FileServer(http.Dir("./dist"))
	mux.Handle("/", fs)

	log.Println("Server starting on port 8080...")
	log.Fatal(http.ListenAndServe(":8080", handler))
}
