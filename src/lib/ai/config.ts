// Provider configurations and model definitions

import type { AIProvider, ProviderConfig } from "@/types/ai-settings";

export const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  ollama: {
    id: "ollama",
    name: "Ollama (Local)",
    description: "Run models locally with Ollama - private and free",
    requiresApiKey: false,
    baseUrlConfigurable: true,
    defaultBaseUrl: "http://localhost:11434",
    models: [
      {
        id: "llama3.2",
        name: "Llama 3.2",
        contextWindow: 128000,
        maxOutputTokens: 4096,
        supportsStreaming: true,
        recommendedFor: ["chat"],
      },
      {
        id: "llama3.1",
        name: "Llama 3.1",
        contextWindow: 128000,
        maxOutputTokens: 4096,
        supportsStreaming: true,
        recommendedFor: ["chat", "generation"],
      },
      {
        id: "mistral",
        name: "Mistral",
        contextWindow: 32000,
        maxOutputTokens: 4096,
        supportsStreaming: true,
        recommendedFor: ["chat"],
      },
      {
        id: "mixtral",
        name: "Mixtral 8x7B",
        contextWindow: 32000,
        maxOutputTokens: 4096,
        supportsStreaming: true,
        recommendedFor: ["chat", "generation"],
      },
      {
        id: "custom",
        name: "Custom Model",
        contextWindow: 32000,
        maxOutputTokens: 4096,
        supportsStreaming: true,
        recommendedFor: ["chat", "generation", "analysis"],
      },
    ],
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic (Claude)",
    description: "Claude models from Anthropic - excellent for research and analysis",
    requiresApiKey: true,
    baseUrlConfigurable: false,
    models: [
      {
        id: "claude-sonnet-4-20250514",
        name: "Claude Sonnet 4",
        contextWindow: 200000,
        maxOutputTokens: 8192,
        supportsStreaming: true,
        recommendedFor: ["chat", "generation", "analysis"],
      },
      {
        id: "claude-3-5-haiku-20241022",
        name: "Claude 3.5 Haiku",
        contextWindow: 200000,
        maxOutputTokens: 8192,
        supportsStreaming: true,
        recommendedFor: ["chat", "analysis"],
      },
    ],
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    description: "GPT models from OpenAI - strong reasoning capabilities",
    requiresApiKey: true,
    baseUrlConfigurable: false,
    models: [
      {
        id: "gpt-4o",
        name: "GPT-4o",
        contextWindow: 128000,
        maxOutputTokens: 4096,
        supportsStreaming: true,
        recommendedFor: ["chat", "generation", "analysis"],
      },
      {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        contextWindow: 128000,
        maxOutputTokens: 16384,
        supportsStreaming: true,
        recommendedFor: ["chat", "analysis"],
      },
      {
        id: "gpt-4-turbo",
        name: "GPT-4 Turbo",
        contextWindow: 128000,
        maxOutputTokens: 4096,
        supportsStreaming: true,
        recommendedFor: ["generation"],
      },
    ],
  },
  google: {
    id: "google",
    name: "Google (Gemini)",
    description: "Gemini models from Google - large context windows",
    requiresApiKey: true,
    baseUrlConfigurable: false,
    models: [
      {
        id: "gemini-2.0-flash",
        name: "Gemini 2.0 Flash",
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        supportsStreaming: true,
        recommendedFor: ["chat", "generation", "analysis"],
      },
      {
        id: "gemini-1.5-pro",
        name: "Gemini 1.5 Pro",
        contextWindow: 2000000,
        maxOutputTokens: 8192,
        supportsStreaming: true,
        recommendedFor: ["generation"],
      },
      {
        id: "gemini-1.5-flash",
        name: "Gemini 1.5 Flash",
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        supportsStreaming: true,
        recommendedFor: ["chat", "analysis"],
      },
    ],
  },
  "openai-compatible": {
    id: "openai-compatible",
    name: "OpenAI-Compatible API",
    description: "Any API compatible with OpenAI format (Together, Groq, etc.)",
    requiresApiKey: true,
    baseUrlConfigurable: true,
    models: [
      {
        id: "custom",
        name: "Custom Model",
        contextWindow: 32000,
        maxOutputTokens: 4096,
        supportsStreaming: true,
        recommendedFor: ["chat", "generation", "analysis"],
      },
    ],
  },
};

export function getDefaultModel(provider: AIProvider): string {
  const config = PROVIDER_CONFIGS[provider];
  return config.models[0]?.id || "custom";
}

export function getProviderConfig(provider: AIProvider): ProviderConfig {
  return PROVIDER_CONFIGS[provider];
}

export function getAllProviders(): ProviderConfig[] {
  return Object.values(PROVIDER_CONFIGS);
}
