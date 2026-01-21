// Load models from the user-editable markdown configuration file

import type { AIProvider } from "@/types/ai-settings";

export interface ModelDefinition {
  id: string;
  name: string;
}

export interface LoadedModels {
  ollama: ModelDefinition[];
  anthropic: ModelDefinition[];
  openai: ModelDefinition[];
  google: ModelDefinition[];
}

// Map markdown section headers to provider IDs
const SECTION_TO_PROVIDER: Record<string, AIProvider> = {
  "Ollama (Local)": "ollama",
  "Anthropic (Claude)": "anthropic",
  "OpenAI": "openai",
  "Google (Gemini)": "google",
};

/**
 * Parse the models.md file format:
 * ## Provider Name
 * - `model-id` - Display Name
 */
export function parseModelsMarkdown(content: string): LoadedModels {
  const result: LoadedModels = {
    ollama: [],
    anthropic: [],
    openai: [],
    google: [],
  };

  let currentProvider: AIProvider | null = null;

  const lines = content.split("\n");

  for (const line of lines) {
    // Check for section header (## Provider Name)
    const headerMatch = line.match(/^## (.+)$/);
    if (headerMatch) {
      const sectionName = headerMatch[1].trim();
      currentProvider = SECTION_TO_PROVIDER[sectionName] || null;
      continue;
    }

    // Check for model definition (- `model-id` - Display Name)
    if (currentProvider) {
      const modelMatch = line.match(/^- `([^`]+)` - (.+)$/);
      if (modelMatch) {
        const [, id, name] = modelMatch;
        result[currentProvider].push({ id: id.trim(), name: name.trim() });
      }
    }
  }

  return result;
}

/**
 * Fetch and parse the models configuration file
 */
export async function loadModelsConfig(): Promise<LoadedModels | null> {
  try {
    const response = await fetch("/models.md");
    if (!response.ok) {
      console.warn("Could not load models.md, using defaults");
      return null;
    }
    const content = await response.text();
    return parseModelsMarkdown(content);
  } catch (error) {
    console.warn("Error loading models.md:", error);
    return null;
  }
}
