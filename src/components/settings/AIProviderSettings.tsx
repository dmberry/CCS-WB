"use client";

import { useState } from "react";
import { useAISettings } from "@/context/AISettingsContext";
import { PROVIDER_CONFIGS, getAllProviders } from "@/lib/ai/config";
import type { AIProvider } from "@/types/ai-settings";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

interface AIProviderSettingsProps {
  onClose?: () => void;
}

export function AIProviderSettings({ onClose }: AIProviderSettingsProps) {
  const {
    settings,
    setProvider,
    setModel,
    setApiKey,
    setBaseUrl,
    setCustomModelId,
    isConfigured,
  } = useAISettings();

  const [showApiKey, setShowApiKey] = useState(false);
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [testError, setTestError] = useState<string | null>(null);

  const currentProvider = PROVIDER_CONFIGS[settings.provider];
  const providers = getAllProviders();

  const handleProviderChange = (provider: AIProvider) => {
    setProvider(provider);
    setIsProviderDropdownOpen(false);
    setTestStatus("idle");
    setTestError(null);
  };

  const handleModelChange = (model: string) => {
    setModel(model);
    setIsModelDropdownOpen(false);
  };

  const handleTestConnection = async () => {
    setTestStatus("testing");
    setTestError(null);

    try {
      const response = await fetch("/api/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AI-Provider": settings.provider,
          "X-AI-Model": settings.model,
          "X-AI-API-Key": settings.apiKey || "",
          "X-AI-Base-URL": settings.baseUrl || "",
          "X-AI-Custom-Model": settings.customModelId || "",
        },
      });

      const data = await response.json();

      if (data.success) {
        setTestStatus("success");
      } else {
        setTestStatus("error");
        setTestError(data.error || "Connection test failed");
      }
    } catch (error) {
      setTestStatus("error");
      setTestError(
        error instanceof Error ? error.message : "Connection test failed"
      );
    }
  };

  const showBaseUrl =
    settings.provider === "ollama" ||
    settings.provider === "openai-compatible";
  const showCustomModel =
    settings.model === "custom" || settings.provider === "openai-compatible";

  return (
    <div className="space-y-5">
      {/* Provider Selection */}
      <div>
        <label className="block font-sans text-caption uppercase tracking-widest text-slate-muted mb-2">
          AI Provider
        </label>
        <div className="relative">
          <button
            onClick={() => setIsProviderDropdownOpen(!isProviderDropdownOpen)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3",
              "bg-white border border-parchment-dark rounded-sm",
              "font-sans text-body-sm text-ink",
              "hover:border-slate-muted transition-colors",
              isProviderDropdownOpen && "ring-1 ring-burgundy border-burgundy"
            )}
          >
            <div>
              <span className="font-medium">{currentProvider.name}</span>
              <span className="text-slate-muted ml-2 text-caption">
                {currentProvider.description}
              </span>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-muted transition-transform",
                isProviderDropdownOpen && "rotate-180"
              )}
            />
          </button>

          {isProviderDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-sm shadow-editorial-lg border border-parchment py-1 z-50 max-h-64 overflow-y-auto">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleProviderChange(provider.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 font-sans text-body-sm",
                    "hover:bg-cream transition-colors",
                    settings.provider === provider.id &&
                      "bg-burgundy/5 text-burgundy"
                  )}
                >
                  <div className="font-medium">{provider.name}</div>
                  <div className="text-caption text-slate-muted">
                    {provider.description}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Model Selection */}
      <div>
        <label className="block font-sans text-caption uppercase tracking-widest text-slate-muted mb-2">
          Model
        </label>
        <div className="relative">
          <button
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3",
              "bg-white border border-parchment-dark rounded-sm",
              "font-sans text-body-sm text-ink",
              "hover:border-slate-muted transition-colors",
              isModelDropdownOpen && "ring-1 ring-burgundy border-burgundy"
            )}
          >
            <span>
              {currentProvider.models.find((m) => m.id === settings.model)
                ?.name || settings.model}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-muted transition-transform",
                isModelDropdownOpen && "rotate-180"
              )}
            />
          </button>

          {isModelDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-sm shadow-editorial-lg border border-parchment py-1 z-50 max-h-48 overflow-y-auto">
              {currentProvider.models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelChange(model.id)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 font-sans text-body-sm",
                    "hover:bg-cream transition-colors",
                    settings.model === model.id && "bg-burgundy/5 text-burgundy"
                  )}
                >
                  {model.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Custom Model ID (for Ollama/OpenAI-compatible) */}
      {showCustomModel && (
        <div>
          <label className="block font-sans text-caption uppercase tracking-widest text-slate-muted mb-2">
            Custom Model ID
          </label>
          <input
            type="text"
            value={settings.customModelId || ""}
            onChange={(e) => setCustomModelId(e.target.value)}
            placeholder="e.g., llama3.2:latest or gpt-4"
            className={cn(
              "w-full px-4 py-3 bg-white border border-parchment-dark rounded-sm",
              "font-sans text-body-sm text-ink",
              "placeholder:text-slate-muted",
              "focus:outline-none focus:ring-1 focus:ring-burgundy focus:border-burgundy"
            )}
          />
        </div>
      )}

      {/* API Key (if required) */}
      {currentProvider.requiresApiKey && (
        <div>
          <label className="block font-sans text-caption uppercase tracking-widest text-slate-muted mb-2">
            API Key
          </label>
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              value={settings.apiKey || ""}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Enter your ${currentProvider.name} API key`}
              className={cn(
                "w-full px-4 py-3 pr-12 bg-white border border-parchment-dark rounded-sm",
                "font-sans text-body-sm text-ink",
                "placeholder:text-slate-muted",
                "focus:outline-none focus:ring-1 focus:ring-burgundy focus:border-burgundy"
              )}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-muted hover:text-ink transition-colors"
            >
              {showApiKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="mt-1.5 font-sans text-caption text-slate-muted">
            Your API key is stored locally in your browser and never sent to our
            servers.
          </p>
        </div>
      )}

      {/* Base URL (for Ollama and OpenAI-compatible) */}
      {showBaseUrl && (
        <div>
          <label className="block font-sans text-caption uppercase tracking-widest text-slate-muted mb-2">
            Base URL
          </label>
          <input
            type="text"
            value={settings.baseUrl || ""}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={
              settings.provider === "ollama"
                ? "http://localhost:11434"
                : "https://api.example.com/v1"
            }
            className={cn(
              "w-full px-4 py-3 bg-white border border-parchment-dark rounded-sm",
              "font-sans text-body-sm text-ink",
              "placeholder:text-slate-muted",
              "focus:outline-none focus:ring-1 focus:ring-burgundy focus:border-burgundy"
            )}
          />
          {settings.provider === "ollama" && (
            <p className="mt-1.5 font-sans text-caption text-slate-muted">
              Start Ollama with{" "}
              <code className="bg-cream px-1 rounded-sm">ollama serve</code> in
              your terminal.
            </p>
          )}
        </div>
      )}

      {/* Test Connection Button */}
      <div className="pt-2">
        <button
          onClick={handleTestConnection}
          disabled={testStatus === "testing" || !isConfigured}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-3",
            "font-sans text-body-sm rounded-sm transition-all",
            testStatus === "success"
              ? "bg-success/10 text-success border border-success/30"
              : testStatus === "error"
                ? "bg-error/10 text-error border border-error/30"
                : "bg-cream text-ink border border-parchment-dark hover:border-burgundy",
            (testStatus === "testing" || !isConfigured) &&
              "opacity-50 cursor-not-allowed"
          )}
        >
          {testStatus === "testing" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Testing connection...
            </>
          ) : testStatus === "success" ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Connection successful
            </>
          ) : testStatus === "error" ? (
            <>
              <XCircle className="h-4 w-4" />
              Connection failed
            </>
          ) : (
            "Test Connection"
          )}
        </button>

        {testError && (
          <p className="mt-2 font-sans text-caption text-error">{testError}</p>
        )}

        {!isConfigured && (
          <p className="mt-2 font-sans text-caption text-slate-muted">
            Please enter your API key to test the connection.
          </p>
        )}
      </div>

      {/* Close button */}
      {onClose && (
        <div className="pt-3 border-t border-parchment">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 font-sans text-body-sm text-slate hover:text-ink hover:bg-cream rounded-sm transition-colors"
          >
            Close Settings
          </button>
        </div>
      )}
    </div>
  );
}
