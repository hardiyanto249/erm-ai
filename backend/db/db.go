package db

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"backend/models"

	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

var DB *sql.DB

func InitDB(dataSourceName string) {
	var err error
	DB, err = sql.Open("postgres", dataSourceName)
	if err != nil {
		log.Fatal(err)
	}

	if err = DB.Ping(); err != nil {
		log.Fatal(err)
	}
	fmt.Println("Successfully connected to the database")
}

func CreateTables() {
	query := `
	CREATE TABLE IF NOT EXISTS laz_partners (
		id SERIAL PRIMARY KEY,
		name VARCHAR(255),
		scale VARCHAR(50),
		description TEXT,
		api_token_hash VARCHAR(255)
	);

	CREATE TABLE IF NOT EXISTS risks (
		id VARCHAR(50),
		laz_id INT,
		description TEXT,
		category VARCHAR(50),
		impact VARCHAR(20),
		likelihood VARCHAR(20),
		status VARCHAR(20),
		context VARCHAR(100), -- New Context/Project Field
		PRIMARY KEY (id, laz_id)
	);

	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		laz_id INT DEFAULT 0,
		email VARCHAR(100) UNIQUE,
		password_hash VARCHAR(255),
		role VARCHAR(20) DEFAULT 'Staff'
	);
	
	CREATE TABLE IF NOT EXISTS metrics (
		laz_id INT,
		name VARCHAR(50),
		value FLOAT,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (laz_id, name)
	);
	`

	_, err := DB.Exec(query)
	if err != nil {
		log.Fatal(err)
	}
	ensureSchemaUpdates()
	fmt.Println("Tables created successfully")
}

func ensureSchemaUpdates() {
	// 1. Add api_token_hash to laz_partners
	var exists bool
	query := `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='laz_partners' AND column_name='api_token_hash')`
	err := DB.QueryRow(query).Scan(&exists)
	if err != nil {
		log.Println("Error checking schema:", err)
		return
	}
	if !exists {
		_, err := DB.Exec("ALTER TABLE laz_partners ADD COLUMN api_token_hash VARCHAR(255)")
		if err != nil {
			log.Println("Error adding api_token_hash column:", err)
		} else {
			fmt.Println("Migrated: Added api_token_hash to laz_partners")
		}
	}

	// 2. Fix Sequence (Prevent duplicate ID error)
	// Because we seeded IDs 1 and 2 manually, the sequence might still be at 1.
	// This forces the sequence to jump to the next available ID.
	_, err = DB.Exec("SELECT setval(pg_get_serial_sequence('laz_partners', 'id'), COALESCE((SELECT MAX(id) + 1 FROM laz_partners), 1), false)")
	if err != nil {
		log.Println("Warning: Failed to update sequence:", err)
	} else {
		fmt.Println("Database sequence synced successfully.")
	}

	// 3. Add Mitigation fields
	cols := map[string]string{
		"mitigation_plan":     "TEXT",
		"mitigation_status":   "VARCHAR(50) DEFAULT 'Planned'",
		"mitigation_progress": "INT DEFAULT 0",
	}

	for colName, colType := range cols {
		var colExists bool
		query := fmt.Sprintf("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='risks' AND column_name='%s')", colName)
		err := DB.QueryRow(query).Scan(&colExists)
		if err != nil {
			log.Printf("Error checking schema for %s: %v", colName, err)
			continue
		}
		if !colExists {
			_, err := DB.Exec(fmt.Sprintf("ALTER TABLE risks ADD COLUMN %s %s", colName, colType))
			if err != nil {
				log.Printf("Error adding %s column: %v", colName, err)
			} else {
				fmt.Printf("Migrated: Added %s to risks\n", colName)
			}
		}
	}

	// 4. Add Context field
	var ctxExists bool
	ctxQuery := "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='risks' AND column_name='context')"
	err = DB.QueryRow(ctxQuery).Scan(&ctxExists)
	if err == nil && !ctxExists {
		_, err := DB.Exec("ALTER TABLE risks ADD COLUMN context VARCHAR(100)")
		if err != nil {
			log.Println("Error adding context column:", err)
		} else {
			fmt.Println("Migrated: Added context to risks")
		}
	}
	// 5. Add created_at field
	var createdAtExists bool
	createdAtQuery := "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='risks' AND column_name='created_at')"
	err = DB.QueryRow(createdAtQuery).Scan(&createdAtExists)
	if err == nil && !createdAtExists {
		_, err := DB.Exec("ALTER TABLE risks ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
		if err != nil {
			log.Println("Error adding created_at column:", err)
		} else {
			fmt.Println("Migrated: Added created_at to risks")
		}
	}

	// 6. Add is_predictor field to metrics
	var isPredExists bool
	isPredQuery := "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='metrics' AND column_name='is_predictor')"
	err = DB.QueryRow(isPredQuery).Scan(&isPredExists)
	if err == nil && !isPredExists {
		_, err := DB.Exec("ALTER TABLE metrics ADD COLUMN is_predictor BOOLEAN DEFAULT TRUE")
		if err != nil {
			log.Println("Error adding is_predictor column:", err)
		} else {
			fmt.Println("Migrated: Added is_predictor to metrics")
		}
	}

	// 7. Add is_active field to laz_partners
	var isActiveExists bool
	isActiveQuery := "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='laz_partners' AND column_name='is_active')"
	err = DB.QueryRow(isActiveQuery).Scan(&isActiveExists)
	if err == nil && !isActiveExists {
		_, err := DB.Exec("ALTER TABLE laz_partners ADD COLUMN is_active BOOLEAN DEFAULT TRUE")
		if err != nil {
			log.Println("Error adding is_active column:", err)
		} else {
			fmt.Println("Migrated: Added is_active to laz_partners")
		}
	}
	// 8. Add app_config table
	_, err = DB.Exec(`CREATE TABLE IF NOT EXISTS app_config (
		key VARCHAR(50) PRIMARY KEY,
		value VARCHAR(255)
	)`)
	if err != nil {
		log.Println("Error creating app_config table:", err)
	}

	// Seed default config if empty
	var countConfig int
	DB.QueryRow("SELECT COUNT(*) FROM app_config").Scan(&countConfig)
	if countConfig == 0 {
		DB.Exec("INSERT INTO app_config (key, value) VALUES ('rha_limit', '12.5'), ('acr_limit', '10')")
		fmt.Println("Seeded default app_config")
	}
}

// Config Functions
func GetAppConfig() (map[string]string, error) {
	rows, err := DB.Query("SELECT key, value FROM app_config")
	if err != nil {
		// If table doesn't exist yet (very first run edge case), return defaults
		return map[string]string{"rha_limit": "12.5", "acr_limit": "10"}, nil
	}
	defer rows.Close()

	config := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err == nil {
			config[k] = v
		}
	}
	// Ensure defaults if missing
	if _, ok := config["rha_limit"]; !ok {
		config["rha_limit"] = "12.5"
	}
	if _, ok := config["acr_limit"]; !ok {
		config["acr_limit"] = "10"
	}

	return config, nil
}

func UpdateAppConfig(key, value string) error {
	_, err := DB.Exec("INSERT INTO app_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2", key, value)
	return err
}

func SeedRisks() {
	// 1. Seed LAZ Partners if not exists
	lazs := []models.LazPartner{
		{ID: 1, Name: "LAZNAS Amanah Sejahtera", Scale: "Nasional", Description: "Mitra Riset 1"},
		{ID: 2, Name: "LAZNAS Berkah Umat", Scale: "Nasional", Description: "Mitra Riset 2"},
	}

	for _, laz := range lazs {
		var exists bool
		DB.QueryRow("SELECT exists(SELECT 1 FROM laz_partners WHERE id=$1)", laz.ID).Scan(&exists)
		if !exists {
			DB.Exec("INSERT INTO laz_partners (id, name, scale, description) VALUES ($1, $2, $3, $4)", laz.ID, laz.Name, laz.Scale, laz.Description)
			fmt.Printf("Seeded LAZ: %s\n", laz.Name)
		}
	}

	// 2. Seed Risks for each LAZ
	baseRisks := []models.Risk{
		{ID: "OP-001", Description: "Kurang tepat dalam menentukan delapan ashnaf", Category: "Operational", Impact: "High", Likelihood: "Medium", Status: "Open"},
		{ID: "OP-002", Description: "Keterlambatan proses pencairan dana kepada mustahik", Category: "Operational", Impact: "Medium", Likelihood: "Low", Status: "Mitigated"},
		{ID: "RP-001", Description: "Kampanye negatif di media sosial", Category: "Reputation", Impact: "Critical", Likelihood: "Medium", Status: "Monitoring"},
		{ID: "SH-001", Description: "Instrumen investasi dana ZIS tidak sesuai fatwa DPS", Category: "ShariaCompliance", Impact: "Critical", Likelihood: "Low", Status: "Open"},
		{ID: "OP-003", Description: "Kegagalan sistem IT saat pengumpulan dana online", Category: "Operational", Impact: "High", Likelihood: "Low", Status: "Mitigated"},
	}

	for _, laz := range lazs {
		for _, risk := range baseRisks {
			var exists bool
			queryCheck := `SELECT exists(SELECT 1 FROM risks WHERE id=$1 AND laz_id=$2)`
			err := DB.QueryRow(queryCheck, risk.ID, laz.ID).Scan(&exists)
			if err == nil && !exists {
				queryInsert := `INSERT INTO risks (id, laz_id, description, category, impact, likelihood, status) VALUES ($1, $2, $3, $4, $5, $6, $7)`
				_, err := DB.Exec(queryInsert, risk.ID, laz.ID, risk.Description, risk.Category, risk.Impact, risk.Likelihood, risk.Status)
				if err != nil {
					log.Println("Error inserting risk:", err)
				} else {
					fmt.Printf("Seeded risk %s for LAZ %d\n", risk.ID, laz.ID)
				}
			}
		}
	}
}

func CreateMetricsTable() {
	// Moved to CreateTables
}

func SeedMetrics() {
	lazs := []int{1, 2}
	metrics := []models.Metric{
		{Name: "RHA", Value: 14.8},
		{Name: "ACR", Value: 8.5},
		{Name: "AvgMitigationDays", Value: 12},
	}

	for _, lazID := range lazs {
		for _, metric := range metrics {
			// Slight variance for different LAZs
			val := metric.Value
			if lazID == 2 {
				val = val * 0.9 // different data for second LAZ
			}

			var exists bool
			DB.QueryRow("SELECT exists(SELECT 1 FROM metrics WHERE name=$1 AND laz_id=$2)", metric.Name, lazID).Scan(&exists)
			if !exists {
				_, err := DB.Exec("INSERT INTO metrics (laz_id, name, value) VALUES ($1, $2, $3)", lazID, metric.Name, val)
				if err != nil {
					log.Println("Error inserting metric:", err)
				} else {
					fmt.Printf("Seeded metric %s for LAZ %d\n", metric.Name, lazID)
				}
			}
		}
	}
}

func GetMetrics(lazID int) ([]models.Metric, error) {
	rows, err := DB.Query("SELECT name, value, to_char(updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at FROM metrics WHERE laz_id=$1", lazID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var metrics []models.Metric
	for rows.Next() {
		var m models.Metric
		if err := rows.Scan(&m.Name, &m.Value, &m.UpdatedAt); err != nil {
			return nil, err
		}
		m.LazID = lazID
		metrics = append(metrics, m)
	}
	return metrics, nil
}

func GetRisks(lazID int) ([]models.Risk, error) {
	rows, err := DB.Query("SELECT id, description, category, impact, likelihood, status, COALESCE(mitigation_plan, ''), COALESCE(mitigation_status, 'Planned'), COALESCE(mitigation_progress, 0), COALESCE(context, ''), COALESCE(to_char(created_at, 'YYYY-MM-DD HH24:MI:SS'), '') FROM risks WHERE laz_id=$1 ORDER BY created_at DESC", lazID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var risks []models.Risk
	for rows.Next() {
		var r models.Risk
		if err := rows.Scan(&r.ID, &r.Description, &r.Category, &r.Impact, &r.Likelihood, &r.Status, &r.MitigationPlan, &r.MitigationStatus, &r.MitigationProgress, &r.Context, &r.CreatedAt); err != nil {
			return nil, err
		}
		r.LazID = lazID
		risks = append(risks, r)
	}
	return risks, nil
}

func CreateRisk(risk models.Risk) error {
	// Jika ID kosong (dari AI atau New Manual), generate ID unik berdasarkan timestamp
	if risk.ID == "" {
		risk.ID = fmt.Sprintf("AI-%d", time.Now().UnixNano()/1e6)
	}

	query := `INSERT INTO risks (id, laz_id, description, category, impact, likelihood, status, mitigation_plan, mitigation_status, mitigation_progress, context) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`
	_, err := DB.Exec(query, risk.ID, risk.LazID, risk.Description, risk.Category, risk.Impact, risk.Likelihood, risk.Status, risk.MitigationPlan, risk.MitigationStatus, risk.MitigationProgress, risk.Context)
	return err
}

func UpdateRisk(risk models.Risk) error {
	query := `UPDATE risks SET description=$1, category=$2, impact=$3, likelihood=$4, status=$5, mitigation_plan=$6, mitigation_status=$7, mitigation_progress=$8, context=$9 WHERE id=$10 AND laz_id=$11`
	_, err := DB.Exec(query, risk.Description, risk.Category, risk.Impact, risk.Likelihood, risk.Status, risk.MitigationPlan, risk.MitigationStatus, risk.MitigationProgress, risk.Context, risk.ID, risk.LazID)
	return err
}

func DeleteRisk(id string, lazID int) error {
	query := `DELETE FROM risks WHERE id=$1 AND laz_id=$2`
	_, err := DB.Exec(query, id, lazID)
	return err
}

func CreateExtendedTables() {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS compliance_items (
			id VARCHAR(50),
			laz_id INT,
			text TEXT,
			completed BOOLEAN,
			PRIMARY KEY (id, laz_id)
		)`,
		`CREATE TABLE IF NOT EXISTS zis_summary (
			laz_id INT PRIMARY KEY,
			total_collected BIGINT,
			total_distributed BIGINT,
			muzakki_count INT,
			mustahik_count INT,
			program_reach INT,
			operational_funds BIGINT,
			productive_funds BIGINT
		)`,
		`CREATE TABLE IF NOT EXISTS zis_collection (
			laz_id INT,
			category VARCHAR(50),
			value BIGINT,
			PRIMARY KEY (laz_id, category)
		)`,
		`CREATE TABLE IF NOT EXISTS zis_distribution (
			laz_id INT,
			ashnaf VARCHAR(50),
			amount BIGINT,
			PRIMARY KEY (laz_id, ashnaf)
		)`,
		`CREATE TABLE IF NOT EXISTS metric_history (
			id SERIAL PRIMARY KEY,
			laz_id INT,
			metric_name VARCHAR(50),
			value FLOAT,
			recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
	}

	for _, query := range queries {
		_, err := DB.Exec(query)
		if err != nil {
			log.Fatal("Error creating extended tables: ", err)
		}
	}
	fmt.Println("Extended tables created successfully")
}

func SeedHistoryIfEmpty() {
	var count int
	DB.QueryRow("SELECT COUNT(*) FROM metric_history").Scan(&count)
	if count > 0 {
		return
	}

	// Generate synthetic history for RHA and ACR
	// Pattern: "Normal" heartbeat is roughly stable with small noise.
	// LAZ 1: Stable
	// LAZ 2: Volatile (potential anomaly)
	lazs := []int{1, 2}
	metrics := []string{"RHA", "ACR"}

	// Create data for last 30 days
	for _, lazID := range lazs {
		for _, m := range metrics {
			baseVal := 10.0 // Base %
			if m == "ACR" {
				baseVal = 5.0
			}

			for i := 30; i >= 0; i-- {
				// Simulating 30 days ago to today
				val := baseVal
				// Add some random noise
				// In real logic we'd import math/rand, but here we can just use simple logic or assume imported
				// simplified for brevity in this replace block, we need to handle randomness properly or just hardcode patterns

				// Let's do simple deterministic pattern for demo
				// Day oscillation
				oscillation := float64(i%5) * 0.2
				val += oscillation

				if lazID == 2 && i < 2 {
					// Recent Spike for LAZ 2 (Anomaly!)
					val += 4.0 // Sudden jump
				}

				query := `INSERT INTO metric_history (laz_id, metric_name, value, recorded_at) VALUES ($1, $2, $3, NOW() - MAKE_INTERVAL(days => $4))`
				DB.Exec(query, lazID, m, val, i)
			}
		}
	}
	fmt.Println("Seeded Metric History for Anomaly Detection")
}

func SeedLeadingIndicators() {
	// 1. Seed PromotionCost (for RHA prediction)
	var countPromo int
	DB.QueryRow("SELECT COUNT(*) FROM metric_history WHERE metric_name = 'PromotionCost'").Scan(&countPromo)

	if countPromo == 0 {
		seedPromotionCost()
	}

	// 2. Seed PendingProposals (for ACR prediction)
	var countPending int
	DB.QueryRow("SELECT COUNT(*) FROM metric_history WHERE metric_name = 'PendingProposals'").Scan(&countPending)

	if countPending == 0 {
		seedPendingProposals()
	}

	fmt.Println("Checked/Seeded Leading Indicators (PromotionCost, PendingProposals)")
}

func seedPromotionCost() {
	// We want to demonstrate: High Promotion Cost (Leading Indicator) -> High RHA (Lagging Indicator)
	// Fetch existing RHA data to reverse-engineer
	rows, err := DB.Query("SELECT laz_id, value, recorded_at FROM metric_history WHERE metric_name = 'RHA'")
	if err != nil {
		log.Println("Error fetching RHA for backfilling:", err)
		return
	}
	defer rows.Close()

	lazs := []int{1, 2}
	for _, lazID := range lazs {
		for i := 30; i >= 0; i-- {
			val := 10.0
			oscillation := float64(i%5) * 2.0
			val += oscillation
			if i < 5 {
				val += 15.0
			}

			// Variance for LAZ 2
			if lazID == 2 {
				val = val * 1.3 // 30% Higher promotion info
			}

			query := `INSERT INTO metric_history (laz_id, metric_name, value, recorded_at) VALUES ($1, $2, $3, NOW() - MAKE_INTERVAL(days => $4))`
			DB.Exec(query, lazID, "PromotionCost", val, i)
		}
	}
}

func seedPendingProposals() {
	lazs := []int{1, 2}
	for _, lazID := range lazs {
		for i := 30; i >= 0; i-- {
			// Base ACR is around 5.0 - 8.5, Predictor pattern:
			val := 20.0 // 20 Proposals pending
			oscillation := float64(i%3) * 5.0
			val += oscillation

			// If i < 5 (Recent), make it HIGH to predict ACR spike
			if i < 5 {
				val += 30.0 // Sudden bottleneck in operations
			}

			// Variance for LAZ 2
			if lazID == 2 {
				val = val * 0.8 // LAZ 2 is faster at processing?
			}

			query := `INSERT INTO metric_history (laz_id, metric_name, value, recorded_at) VALUES ($1, $2, $3, NOW() - MAKE_INTERVAL(days => $4))`
			DB.Exec(query, lazID, "PendingProposals", val, i)
		}
	}
}

func SeedExtendedData() {
	lazs := []int{1, 2}

	// Seed Compliance Items
	baseItems := []models.ComplianceItem{
		{ID: "sc-1", Text: "Struktur akad pengumpulan dana (ZIS) telah disetujui DPS.", Completed: true},
		{ID: "sc-2", Text: "Proses penyaluran dana sesuai dengan 8 golongan (ashnaf).", Completed: true},
		{ID: "sc-3", Text: "Investasi dana ZIS ditempatkan pada instrumen syariah yang bebas riba.", Completed: false},
		{ID: "sc-4", Text: "Laporan keuangan tahunan telah diaudit oleh auditor syariah.", Completed: true},
		{ID: "sc-5", Text: "Rasio Hak Amil (RHA) tidak melebihi batas yang ditetapkan syariat.", Completed: true},
	}

	for _, lazID := range lazs {
		for _, item := range baseItems {
			// Variance: LAZ 2 has different completion status
			completed := item.Completed
			if lazID == 2 && item.ID == "sc-1" {
				completed = false
			}

			var exists bool
			DB.QueryRow("SELECT exists(SELECT 1 FROM compliance_items WHERE id=$1 AND laz_id=$2)", item.ID, lazID).Scan(&exists)
			if !exists {
				_, err := DB.Exec("INSERT INTO compliance_items (id, laz_id, text, completed) VALUES ($1, $2, $3, $4)", item.ID, lazID, item.Text, completed)
				if err != nil {
					log.Println("Error inserting compliance item:", err)
				} else {
					fmt.Printf("Seeded compliance item %s for LAZ %d\n", item.ID, lazID)
				}
			}
		}

		// Seed ZIS Summary
		var summaryExists bool
		DB.QueryRow("SELECT exists(SELECT 1 FROM zis_summary WHERE laz_id=$1)", lazID).Scan(&summaryExists)
		if !summaryExists {
			mult := int64(1)
			if lazID == 2 {
				mult = 2
			} // LAZ 2 is bigger
			_, err := DB.Exec(`INSERT INTO zis_summary (laz_id, total_collected, total_distributed, muzakki_count, mustahik_count, program_reach, operational_funds, productive_funds) 
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
				lazID, 925000000*mult, 710000000*mult, 15480*int(mult), 8950*int(mult), 15*int(mult), 85000000*mult, 150000000*mult)
			if err != nil {
				log.Println("Error inserting ZIS summary:", err)
			} else {
				fmt.Printf("Seeded ZIS summary for LAZ %d\n", lazID)
			}
		}

		// Seed Collection Breakdown
		collections := []models.ZisCollectionBreakdown{
			{Category: "Zakat", Value: 450000000},
			{Category: "Infaq/Sadaqah", Value: 280000000},
			{Category: "Wakaf", Value: 120000000},
			{Category: "DSKL", Value: 75000000},
		}
		for _, col := range collections {
			mult := int64(1)
			if lazID == 2 {
				mult = 2
			}
			_, err := DB.Exec("INSERT INTO zis_collection (laz_id, category, value) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", lazID, col.Category, col.Value*mult)
			if err != nil {
				log.Println("Error inserting ZIS collection:", err)
			} else {
				fmt.Printf("Seeded ZIS collection %s for LAZ %d\n", col.Category, lazID)
			}
		}

		// Seed Distribution Breakdown
		distributions := []models.ZisDistributionBreakdown{
			{Ashnaf: "Fakir", Amount: 110000000}, {Ashnaf: "Miskin", Amount: 150000000},
			{Ashnaf: "Amil", Amount: 85000000}, {Ashnaf: "Mualaf", Amount: 50000000},
			{Ashnaf: "Riqab", Amount: 20000000}, {Ashnaf: "Gharim", Amount: 70000000},
			{Ashnaf: "Fisabilillah", Amount: 180000000}, {Ashnaf: "Ibnu Sabil", Amount: 45000000},
		}
		for _, dist := range distributions {
			mult := int64(1)
			if lazID == 2 {
				mult = 2
			}
			_, err := DB.Exec("INSERT INTO zis_distribution (laz_id, ashnaf, amount) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", lazID, dist.Ashnaf, dist.Amount*mult)
			if err != nil {
				log.Println("Error inserting ZIS distribution:", err)
			} else {
				fmt.Printf("Seeded ZIS distribution %s for LAZ %d\n", dist.Ashnaf, lazID)
			}
		}
	}
}

func GetLazIDByToken(tokenHash string) (int, error) {
	var id int
	err := DB.QueryRow("SELECT id FROM laz_partners WHERE api_token_hash=$1", tokenHash).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func GetLazPartners() ([]models.LazPartner, error) {
	rows, err := DB.Query("SELECT id, name, scale, description, COALESCE(is_active, TRUE) FROM laz_partners WHERE COALESCE(is_active, TRUE) = TRUE ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var partners []models.LazPartner
	for rows.Next() {
		var p models.LazPartner
		rows.Scan(&p.ID, &p.Name, &p.Scale, &p.Description, &p.IsActive)
		partners = append(partners, p)
	}
	return partners, nil
}

func GetAllLazPartners() ([]models.LazPartner, error) {
	rows, err := DB.Query("SELECT id, name, scale, description, COALESCE(is_active, TRUE) FROM laz_partners ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var partners []models.LazPartner
	for rows.Next() {
		var p models.LazPartner
		rows.Scan(&p.ID, &p.Name, &p.Scale, &p.Description, &p.IsActive)
		partners = append(partners, p)
	}
	return partners, nil
}

func GetComplianceItems(lazID int) ([]models.ComplianceItem, error) {
	rows, err := DB.Query("SELECT id, text, completed FROM compliance_items WHERE laz_id=$1 ORDER BY id", lazID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []models.ComplianceItem
	for rows.Next() {
		var i models.ComplianceItem
		rows.Scan(&i.ID, &i.Text, &i.Completed)
		i.LazID = lazID
		items = append(items, i)
	}
	return items, nil
}

func AddComplianceItem(item models.ComplianceItem) error {
	_, err := DB.Exec("INSERT INTO compliance_items (id, laz_id, text, completed) VALUES ($1, $2, $3, $4)", item.ID, item.LazID, item.Text, item.Completed)
	return err
}

func ToggleComplianceItem(id string, lazID int) error {
	_, err := DB.Exec("UPDATE compliance_items SET completed = NOT completed WHERE id = $1 AND laz_id = $2", id, lazID)
	return err
}

func GetZisData(lazID int) (models.ZisData, error) {
	var data models.ZisData
	data.Summary.LazID = lazID

	// Summary
	err := DB.QueryRow("SELECT total_collected, total_distributed, muzakki_count, mustahik_count, program_reach, operational_funds, productive_funds FROM zis_summary WHERE laz_id=$1", lazID).
		Scan(&data.Summary.TotalCollected, &data.Summary.TotalDistributed, &data.Summary.MuzakkiCount, &data.Summary.MustahikCount, &data.Summary.ProgramReach, &data.Summary.OperationalFunds, &data.Summary.ProductiveFunds)
	if err != nil {
		return data, err
	}

	// Collection
	cRows, err := DB.Query("SELECT category, value FROM zis_collection WHERE laz_id=$1", lazID)
	if err != nil {
		return data, err
	}
	defer cRows.Close()
	for cRows.Next() {
		var c models.ZisCollectionBreakdown
		c.LazID = lazID
		cRows.Scan(&c.Category, &c.Value)
		data.Collection = append(data.Collection, c)
	}

	// Distribution
	dRows, err := DB.Query("SELECT ashnaf, amount FROM zis_distribution WHERE laz_id=$1", lazID)
	if err != nil {
		return data, err
	}
	defer dRows.Close()
	for dRows.Next() {
		var d models.ZisDistributionBreakdown
		d.LazID = lazID
		dRows.Scan(&d.Ashnaf, &d.Amount)
		data.Distribution = append(data.Distribution, d)
	}

	return data, nil
}

func CreateLazPartner(name, scale, description string) (int, error) {
	// Removed token logic for LAZ
	var id int
	err := DB.QueryRow("INSERT INTO laz_partners (name, scale, description) VALUES ($1, $2, $3) RETURNING id",
		name, scale, description).Scan(&id)
	return id, err
}

// USER & AUTH DB FUNCTIONS

func CreateUser(email, hashedPassword, role string, lazID int) error {
	_, err := DB.Exec("INSERT INTO users (email, password_hash, role, laz_id) VALUES ($1, $2, $3, $4)", email, hashedPassword, role, lazID)
	return err
}

func GetUserByEmail(email string) (models.User, error) {
	var u models.User
	err := DB.QueryRow("SELECT id, laz_id, email, password_hash, role FROM users WHERE email=$1", email).
		Scan(&u.ID, &u.LazID, &u.Email, &u.PasswordHash, &u.Role)
	return u, err
}

func GetLazByID(id int) (models.LazPartner, error) {
	var p models.LazPartner
	err := DB.QueryRow("SELECT id, name, scale, description, COALESCE(is_active, TRUE) FROM laz_partners WHERE id=$1", id).
		Scan(&p.ID, &p.Name, &p.Scale, &p.Description, &p.IsActive)
	return p, err
}

func UpdateLazStatus(id int, isActive bool) error {
	_, err := DB.Exec("UPDATE laz_partners SET is_active=$1 WHERE id=$2", isActive, id)
	return err
}

// Seeding Default Admin
func SeedAdmin() {
	var exists bool
	DB.QueryRow("SELECT exists(SELECT 1 FROM users WHERE role='Admin')").Scan(&exists)
	if !exists {
		// Default Admin: admin@erm.com / admin123
		// Generated using bcrypt cost 10
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		if err != nil {
			log.Println("Error hashing admin password:", err)
			return
		}

		_, err = DB.Exec("INSERT INTO users (email, password_hash, role, laz_id) VALUES ($1, $2, $3, $4)", "admin@erm.com", string(hashedPassword), "Admin", 0)
		if err != nil {
			log.Println("Error seeding admin:", err)
		} else {
			fmt.Println("Seeded Default Admin: admin@erm.com / admin123")
		}
	}
}
