package config

import (
	"os"
)

type Config struct {
	GeminiAPIKey string
	PromptCfg    *PromptConfig
}

func Load() *Config {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		apiKey = "AIzaSyDgySd7zNTASrSyp4ngvXwhDYC1fmkXPF8" // Fallback for MVP
	}

	return &Config{
		GeminiAPIKey: apiKey,
		PromptCfg:    LoadPrompts(),
	}
}
