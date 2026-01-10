package config

import (
	"log"
	"os"

	"gopkg.in/yaml.v3"
)

type PromptConfig struct {
	SystemInstruction string `yaml:"system_instruction"`
	AnalysisPrompt    string `yaml:"analysis_prompt"`
}

func LoadPrompts() *PromptConfig {
	path := "config/prompts.yaml"
	data, err := os.ReadFile(path)
	if err != nil {
		log.Printf("⚠️ Warning: Failed to read prompts.yaml: %v. Using defaults.", err)
		return &PromptConfig{}
	}
	var config PromptConfig
	if err := yaml.Unmarshal(data, &config); err != nil {
		log.Fatalf("❌ Failed to parse prompts.yaml: %v", err)
	}
	log.Println("✅ Prompts loaded successfully")
	return &config
}
