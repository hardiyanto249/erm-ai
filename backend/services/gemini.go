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

	// Auto-detect best available model
	var selectedModel string
	iter := client.ListModels(ctx)
	fmt.Println("🔍 DEBUG: Scanning available Gemini Models...")
	for {
		m, err := iter.Next()
		if err != nil {
			break
		}
		// fmt.Printf(" - Found: %s\n", m.Name)

		// Check if supports generateContent
		supportsGenerate := false
		for _, method := range m.SupportedGenerationMethods {
			if method == "generateContent" {
				supportsGenerate = true
				break
			}
		}

		if supportsGenerate {
			// Prioritize Flash or Pro
			if strings.Contains(m.Name, "flash") {
				selectedModel = m.Name
			} else if strings.Contains(m.Name, "pro") && !strings.Contains(selectedModel, "flash") {
				selectedModel = m.Name
			} else if selectedModel == "" {
				selectedModel = m.Name // Fallback to any generateContent model
			}
		}
	}

	// Clean up model name (remove "models/" prefix if present, though library handles it generally,
	// GenerativeModel expects name like "gemini-pro" or "models/gemini-pro")
	if selectedModel == "" {
		fmt.Println("⚠️ Warning: No suitable Gemini model found during scan. Defaulting to 'gemini-pro'")
		selectedModel = "gemini-pro"
	} else {
		// client.GenerativeModel prefers just the name often, but let's keep what ListModels returns
		// ListModels returns "models/gemini-pro".
		// client.GenerativeModel handles "models/" prefix fine.
		fmt.Printf("✅ Selected AI Model: %s\n", selectedModel)
	}
	fmt.Println("-------------------------------------------")

	return &GeminiService{ctx: ctx, client: client, ModelName: selectedModel}, nil
}

func (s *GeminiService) GenerateRisks(lazID int, eventType string, promptCfg *config.PromptConfig) ([]models.GeneratedRisk, error) {
	if promptCfg == nil || promptCfg.AnalysisPrompt == "" {
		return nil, fmt.Errorf("prompt configuration is missing or empty")
	}

	// Use dynamically selected model
	model := s.client.GenerativeModel(s.ModelName)

	// Set system instruction
	if promptCfg.SystemInstruction != "" {
		model.SystemInstruction = &genai.Content{
			Parts: []genai.Part{
				genai.Text(promptCfg.SystemInstruction),
			},
		}
	}

	// Configure JSON response (if supported by the client library version and model)
	// Note: explicit JSON mode or just prompting. standard genai-go supports MIME type storage in underlying pb but high level might vary.
	// For "gemini-1.5-flash", we can just rely on the prompt asking for JSON.
	model.ResponseMIMEType = "application/json"

	// Ambil historical context dari DB
	historicalContext, err := getHistoricalContext(lazID)
	if err != nil {
		// Non-blocking, continue with empty context if DB fail
		historicalContext = ""
	}

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

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("empty response from Gemini")
	}

	// Extract text
	var responseText string
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			responseText += string(txt)
		}
	}

	// Clean Markdown code blocks
	// Robust cleanup for "```json", "```", and surrounding whitespace/newlines
	responseText = strings.TrimSpace(responseText)
	if strings.HasPrefix(responseText, "```json") {
		responseText = strings.TrimPrefix(responseText, "```json")
	} else if strings.HasPrefix(responseText, "```") {
		responseText = strings.TrimPrefix(responseText, "```")
	}
	if strings.HasSuffix(responseText, "```") {
		responseText = strings.TrimSuffix(responseText, "```")
	}
	responseText = strings.TrimSpace(responseText)

	var risks []models.GeneratedRisk
	if err := json.Unmarshal([]byte(responseText), &risks); err != nil {
		fmt.Printf("❌ JSON Parse Error: %v\nRaw Text: %s\n", err, responseText)
		// Check if the response was just a refusal or plain text
		return nil, fmt.Errorf("failed to parse JSON from AI response: %v", err)
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
