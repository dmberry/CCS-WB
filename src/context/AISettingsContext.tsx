"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type {
  AISettings,
  AISettingsStorage,
  AIProvider,
} from "@/types/ai-settings";
import { DEFAULT_AI_SETTINGS } from "@/types/ai-settings";
import { getDefaultModel, PROVIDER_CONFIGS } from "@/lib/ai/config";

const STORAGE_KEY = "ccs-lab-ai-settings";
const STORAGE_VERSION = "1.0";

interface AISettingsContextValue {
  settings: AISettings;
  isLoaded: boolean;
  isConfigured: boolean;
  updateSettings: (updates: Partial<AISettings>) => void;
  setProvider: (provider: AIProvider) => void;
  setModel: (model: string) => void;
  setApiKey: (key: string) => void;
  setBaseUrl: (url: string) => void;
  setCustomModelId: (modelId: string) => void;
  clearSettings: () => void;
  getRequestHeaders: () => Record<string, string>;
}

const AISettingsContext = createContext<AISettingsContextValue | null>(null);

export function AISettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: AISettingsStorage = JSON.parse(stored);
        if (parsed.version === STORAGE_VERSION && parsed.settings) {
          setSettings(parsed.settings);
        }
      }
    } catch (e) {
      console.error("Failed to load AI settings:", e);
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage on change
  useEffect(() => {
    if (isLoaded) {
      try {
        const storage: AISettingsStorage = {
          version: STORAGE_VERSION,
          settings,
          lastUpdated: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
      } catch (e) {
        console.error("Failed to save AI settings:", e);
      }
    }
  }, [settings, isLoaded]);

  // Check if provider is properly configured
  const isConfigured = useCallback(() => {
    const providerConfig = PROVIDER_CONFIGS[settings.provider];
    if (providerConfig.requiresApiKey && !settings.apiKey) {
      return false;
    }
    return true;
  }, [settings.provider, settings.apiKey]);

  const updateSettings = useCallback((updates: Partial<AISettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const setProvider = useCallback((provider: AIProvider) => {
    setSettings((prev) => ({
      ...prev,
      provider,
      model: getDefaultModel(provider),
      // Clear base URL when switching away from Ollama/OpenAI-compatible
      baseUrl:
        provider === "ollama" || provider === "openai-compatible"
          ? prev.baseUrl
          : undefined,
      customModelId: undefined,
    }));
  }, []);

  const setModel = useCallback((model: string) => {
    setSettings((prev) => ({ ...prev, model }));
  }, []);

  const setApiKey = useCallback((apiKey: string) => {
    setSettings((prev) => ({ ...prev, apiKey }));
  }, []);

  const setBaseUrl = useCallback((baseUrl: string) => {
    setSettings((prev) => ({ ...prev, baseUrl }));
  }, []);

  const setCustomModelId = useCallback((customModelId: string) => {
    setSettings((prev) => ({ ...prev, customModelId }));
  }, []);

  const clearSettings = useCallback(() => {
    setSettings(DEFAULT_AI_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Generate headers to send with API requests
  const getRequestHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      "X-AI-Provider": settings.provider,
      "X-AI-Model": settings.model,
    };

    if (settings.apiKey) {
      headers["X-AI-API-Key"] = settings.apiKey;
    }

    if (settings.baseUrl) {
      headers["X-AI-Base-URL"] = settings.baseUrl;
    }

    if (settings.customModelId) {
      headers["X-AI-Custom-Model"] = settings.customModelId;
    }

    return headers;
  }, [settings]);

  return (
    <AISettingsContext.Provider
      value={{
        settings,
        isLoaded,
        isConfigured: isConfigured(),
        updateSettings,
        setProvider,
        setModel,
        setApiKey,
        setBaseUrl,
        setCustomModelId,
        clearSettings,
        getRequestHeaders,
      }}
    >
      {children}
    </AISettingsContext.Provider>
  );
}

export function useAISettings() {
  const context = useContext(AISettingsContext);
  if (!context) {
    throw new Error("useAISettings must be used within an AISettingsProvider");
  }
  return context;
}
