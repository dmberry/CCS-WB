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

const STORAGE_KEY = "ccs-wb-ai-settings";
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
  setAiEnabled: (enabled: boolean) => void;
  setBeDirectMode: (enabled: boolean) => void;
  setTeachMeMode: (enabled: boolean) => void;
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
          // Migrate old settings that don't have newer fields
          const migratedSettings: AISettings = {
            ...parsed.settings,
            aiEnabled: parsed.settings.aiEnabled ?? true,
            beDirectMode: parsed.settings.beDirectMode ?? false,
            teachMeMode: parsed.settings.teachMeMode ?? false,
          };
          setSettings(migratedSettings);
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

  const setAiEnabled = useCallback((aiEnabled: boolean) => {
    setSettings((prev) => ({ ...prev, aiEnabled }));
  }, []);

  const setBeDirectMode = useCallback((beDirectMode: boolean) => {
    setSettings((prev) => ({ ...prev, beDirectMode }));
  }, []);

  const setTeachMeMode = useCallback((teachMeMode: boolean) => {
    setSettings((prev) => ({ ...prev, teachMeMode }));
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
      "X-AI-Be-Direct": settings.beDirectMode ? "true" : "false",
      "X-AI-Teach-Me": settings.teachMeMode ? "true" : "false",
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
        setAiEnabled,
        setBeDirectMode,
        setTeachMeMode,
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
