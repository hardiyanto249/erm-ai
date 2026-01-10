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
		apiKey = "AIzaSyAnlltJf_x3tZ7ElrNNVypVo4W9CeTEBrw"
	}

	return &Config{
		GeminiAPIKey: apiKey,
		PromptCfg:    LoadPrompts(),
	}
}
