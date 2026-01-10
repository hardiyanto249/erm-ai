package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"backend/db"

	"github.com/jung-kurt/gofpdf"
)

func GenerateRiskReport(w http.ResponseWriter, r *http.Request) {
	lazID := getLazID(r)

	// Fetch Data
	risks, err := db.GetRisks(lazID)
	if err != nil {
		http.Error(w, "Failed to fetch risks", http.StatusInternalServerError)
		return
	}

	// Get LAZ Name (Simplification: fetch all and find, or just hardcode/query if we had single fetch)
	// We'll use a simple query helper here or just "LAZ Partner" if specific fetch not strictly available
	// But let's try to query laz_partners table directly for name
	var lazName string
	db.DB.QueryRow("SELECT name FROM laz_partners WHERE id = $1", lazID).Scan(&lazName)
	if lazName == "" {
		lazName = "LAZ Partner ID " + strconv.Itoa(lazID)
	}

	// Calculate Stats
	totalRisks := len(risks)
	highRisks := 0
	mitigatedRisks := 0
	for _, r := range risks {
		if r.Impact == "High" || r.Impact == "Critical" {
			highRisks++
		}
		if r.Status == "Mitigated" || r.Status == "Closed" {
			mitigatedRisks++
		}
	}

	// Initialize PDF
	pdf := gofpdf.New("L", "mm", "A4", "") // Landscape
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 16)

	// Header
	pdf.Cell(40, 10, "Laporan Profil Risiko (Risk Register)")
	pdf.Ln(8)
	pdf.SetFont("Arial", "", 12)
	pdf.Cell(40, 10, fmt.Sprintf("Institusi: %s", lazName))
	pdf.Ln(6)
	pdf.Cell(40, 10, fmt.Sprintf("Tanggal Laporan: %s", time.Now().Format("02 Jan 2006 15:04")))
	pdf.Ln(12)

	// Summary Box
	pdf.SetFillColor(240, 240, 240)
	pdf.Rect(10, 35, 277, 20, "F")
	pdf.SetXY(12, 37)
	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(50, 8, fmt.Sprintf("Total Risiko: %d", totalRisks))
	pdf.Cell(50, 8, fmt.Sprintf("High/Critical: %d", highRisks))
	pdf.Cell(50, 8, fmt.Sprintf("Mitigated/Closed: %d", mitigatedRisks))
	pdf.Ln(20)

	// Table Header
	headers := []string{"ID", "Description", "Category", "Impact", "Likelihood", "Status", "Mitigation Plan"}
	widths := []float64{20, 80, 35, 25, 25, 25, 65}

	pdf.SetFillColor(200, 220, 255)
	pdf.SetFont("Arial", "B", 10)

	for i, h := range headers {
		pdf.CellFormat(widths[i], 10, h, "1", 0, "C", true, 0, "")
	}
	pdf.Ln(-1)

	// Table Body
	pdf.SetFont("Arial", "", 9)
	pdf.SetFillColor(255, 255, 255)

	for _, req := range risks {
		// Calculate height based on description or plan length
		// gofpdf MultiCell is tricky in tables. simpler is to truncate or single line.
		// For proper reporting we should use multi cell logic but for MVP single line with truncation or small font.
		// Let's use simple Cell with truncation for now to keep layout stable.

		desc := req.Description
		if len(desc) > 50 {
			desc = desc[:47] + "..."
		}

		plan := req.MitigationPlan
		if len(plan) > 40 {
			plan = plan[:37] + "..."
		}
		if plan == "" {
			plan = "-"
		}

		pdf.CellFormat(widths[0], 8, req.ID, "1", 0, "C", false, 0, "")
		pdf.CellFormat(widths[1], 8, desc, "1", 0, "L", false, 0, "")
		pdf.CellFormat(widths[2], 8, req.Category, "1", 0, "L", false, 0, "")

		// Conditional formatting?
		pdf.CellFormat(widths[3], 8, req.Impact, "1", 0, "C", false, 0, "")
		pdf.CellFormat(widths[4], 8, req.Likelihood, "1", 0, "C", false, 0, "")
		pdf.CellFormat(widths[5], 8, req.Status, "1", 0, "C", false, 0, "")
		pdf.CellFormat(widths[6], 8, plan, "1", 0, "L", false, 0, "")

		pdf.Ln(-1)
	}

	// Output
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", "attachment; filename=risk_report.pdf")

	err = pdf.Output(w)
	if err != nil {
		fmt.Println("Error generating PDF:", err)
		http.Error(w, "Failed to generate PDF", http.StatusInternalServerError)
	}
}
