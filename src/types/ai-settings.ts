// AI Provider Types for Multi-Provider Support

export type AIProvider =
  | "anthropic"
  | "openai"
  | "google"
  | "ollama"
  | "openai-compatible";

export interface ModelConfig {
  id: string;
  name: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsStreaming: boolean;
  recommendedFor: ("chat" | "generation" | "analysis")[];
}

export interface ProviderConfig {
  id: AIProvider;
  name: string;
  description: string;
  models: ModelConfig[];
  requiresApiKey: boolean;
  baseUrlConfigurable: boolean;
  defaultBaseUrl?: string;
}

export interface AISettings {
  provider: AIProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string; // For Ollama and OpenAI-compatible
  customModelId?: string; // For custom model names
  aiEnabled: boolean; // Master toggle for AI functionality
}

export interface AISettingsStorage {
  version: string;
  settings: AISettings;
  lastUpdated: string;
}

export interface AIRequestConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

export interface AIValidationResult {
  valid: boolean;
  error?: string;
  requiresSetup?: boolean;
}

// Default settings for new users - Ollama is default for local/free usage
export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: "ollama",
  model: "llama3.2",
  baseUrl: "http://localhost:11434",
  aiEnabled: true,
};
