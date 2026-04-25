package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"text/template"
	"time"

	"backend/config"
	"backend/db"
	"backend/models"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

type GeminiService struct {
	ctx       context.Context
	client    *genai.Client
	ModelName string
}

type PromptData struct {
	EventType         string
	HistoricalContext string
}

func NewGeminiService(cfg *config.Config) (*GeminiService, error) {
	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(cfg.GeminiAPIKey))
	if err != nil {
		return nil, err
	}

	// SMART RADAR SCANNER (v2.0 UltraSonik): 
	// Kita tidak lagi menebak. Kita tanya langsung ke API Google model apa yang aktif bagi bapak.
	var selectedModel string
	iter := client.ListModels(ctx)
	for {
		m, err := iter.Next()
		if err != nil { break }
		
		// Syarat: Harus dukung generateContent
		canGenerate := false
		for _, method := range m.SupportedGenerationMethods {
			if method == "generateContent" { canGenerate = true; break }
		}

		if canGenerate {
			// Prioritas: Cari yang mengandung '1.5' dan 'flash'
			if strings.Contains(m.Name, "1.5") && strings.Contains(m.Name, "flash") {
				selectedModel = strings.TrimPrefix(m.Name, "models/")
				break // Langsung kunci!
			}
			// Cadangan: Ambil model 'pro' jika flash tidak ada
			if strings.Contains(m.Name, "pro") && selectedModel == "" {
				selectedModel = strings.TrimPrefix(m.Name, "models/")
			}
		}
	}

	if selectedModel == "" {
		selectedModel = "gemini-1.5-flash-latest" // Harapan terakhir
	}

	fmt.Printf("✅ SCANNER SUCCESS: Menggunakan model terverifikasi -> %s\n", selectedModel)
	fmt.Println("-------------------------------------------")

	return &GeminiService{ctx: ctx, client: client, ModelName: selectedModel}, nil
}

func (s *GeminiService) GenerateRisks(lazID int, eventType string, promptCfg *config.PromptConfig) ([]models.GeneratedRisk, error) {
	if promptCfg == nil || promptCfg.AnalysisPrompt == "" {
		return nil, fmt.Errorf("prompt configuration is missing or empty")
	}

	// Use dynamically selected model
	model := s.client.GenerativeModel(s.ModelName)

	// DINONAKTIFKAN TOTAL (Hotfix v3 per diskusi audit): 
	// Menghindari Error 400 pada model lawas. Seluruh instruksi dialihkan ke Prompt Utama.
	/*
	if promptCfg != nil && promptCfg.SystemInstruction != "" {
		fmt.Printf("ℹ️  Menggunakan SystemInstruction: %s\n", promptCfg.SystemInstruction[:10]+"...")
		model.SystemInstruction = &genai.Content{
			Parts: []genai.Part{
				genai.Text(promptCfg.SystemInstruction),
			},
		}
	}
	*/

	// DINONAKTIFKAN (Hotfix Per diskusi Audit UltraSonik): 
	// Menghindari Error 400: JSON mode is not enabled for this model
	// Kita akan mengandalkan instruksi prompt untuk mendapatkan format JSON.
	// model.ResponseMIMEType = "application/json"

	// Ambil historical context dari DB
	historicalContext, err := getHistoricalContext(lazID)
	if err != nil {
		historicalContext = ""
	}

	// AUDIT ULTRASONIK: Pembersihan karakter yang berisiko merusak integrasi prompt
	historicalContext = strings.ReplaceAll(historicalContext, "\"", "'")
	historicalContext = strings.ReplaceAll(historicalContext, "\n", " ")
	historicalContext = strings.ReplaceAll(historicalContext, "\r", " ")

	data := PromptData{
		EventType:         eventType,
		HistoricalContext: historicalContext,
	}

	// Parse template
	tmpl, err := template.New("risk_analysis").Parse(promptCfg.AnalysisPrompt)
	if err != nil {
		return nil, err
	}

	var promptBuf bytes.Buffer
	if err := tmpl.Execute(&promptBuf, data); err != nil {
		return nil, err
	}

	finalPrompt := promptBuf.String()

	// Semaphore handled in goroutine if batching, but here direct call is fine for single user request.
	// We'll wrap in timeout.

	// Increase timeout for newer models or slow connections
	ctx, cancel := context.WithTimeout(s.ctx, 60*time.Second)
	defer cancel()

	resp, err := model.GenerateContent(ctx, genai.Text(finalPrompt))
	if err != nil {
		return nil, err
	}

	// Extract text
	var responseText string
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			responseText += string(txt)
		}
	}

	// Clean Markdown code blocks
	responseText = strings.TrimSpace(responseText)
	if strings.HasPrefix(responseText, "```json") {
		responseText = strings.TrimPrefix(responseText, "```json")
	} else if strings.HasPrefix(responseText, "```") {
		responseText = strings.TrimPrefix(responseText, "```")
	}
	if strings.HasSuffix(responseText, "```") {
		responseText = strings.TrimSuffix(responseText, "```")
	}

	// Extracted text cleanup (more robust)
	responseText = strings.TrimSpace(responseText)
	
	// Helper regex-like cleaning for trailing commas before closing braces/brackets
	responseText = strings.ReplaceAll(responseText, ",}", "}")
	responseText = strings.ReplaceAll(responseText, ",]", "]")

	// AUDIT ULTRASONIK: Robot Penyaring JSON Agresif
	// AI seringkali menambah teks seperti "Tentu, ini hasilnya..." di depan JSON.
	// Kami akan membuang semua teks tersebut secara paksa.
	startIdx := strings.Index(responseText, "[")
	endIdx := strings.LastIndex(responseText, "]")

	if startIdx == -1 || endIdx == -1 || endIdx <= startIdx {
		fmt.Printf("❌ CRITICAL FAILURE: AI tidak memberikan format JSON array.\nRaw Output: %s\n", responseText)
		return nil, fmt.Errorf("AI gagal memberikan data terstruktur. Silakan coba klik 'Generate' sekali lagi.")
	}

	// Ambil hanya bongkahan JSON-nya saja
	sanitizedJSON := responseText[startIdx : endIdx+1]

	var risks []models.GeneratedRisk
	if err := json.Unmarshal([]byte(sanitizedJSON), &risks); err != nil {
		fmt.Printf("❌ JSON Parse Error: %v\nExtracted: %s\n", err, sanitizedJSON)
		return nil, fmt.Errorf("Format data tidak sesuai standar syariah. Mohon coba lagi.")
	}

	return risks, nil
}

func getHistoricalContext(lazID int) (string, error) {
	// Aggregate deskripsi risiko existing dari DB untuk konteks
	// Limit to recent 10 to check style
	rows, err := db.DB.Query("SELECT description FROM risks WHERE laz_id=$1 LIMIT 10", lazID)
	if err != nil {
		return "", err
	}
	defer rows.Close()

	var builder strings.Builder
	for rows.Next() {
		var desc string
		rows.Scan(&desc)
		builder.WriteString(desc + ". ")
	}
	return builder.String(), nil
}
