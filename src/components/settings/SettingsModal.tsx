"use client";

import { useState } from "react";
import { X, Bot, Palette, Info, Minus, Plus, Code, Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIProviderSettings } from "./AIProviderSettings";
import { useAppSettings } from "@/context/AppSettingsContext";
import {
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
  UI_FONT_SIZE_MIN,
  UI_FONT_SIZE_MAX,
  PROGRAMMING_LANGUAGES,
  type ProgrammingLanguageId,
  type ThemeMode,
} from "@/types/app-settings";

type SettingsTab = "code" | "appearance" | "ai" | "about";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
}

export function SettingsModal({
  isOpen,
  onClose,
  initialTab = "appearance",
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const {
    settings,
    setGlobalCodeFontSize,
    setGlobalChatFontSize,
    setUiFontSize,
    setDefaultLanguage,
    setTheme,
  } = useAppSettings();

  if (!isOpen) return null;

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "code", label: "Code", icon: <Code className="h-4 w-4" /> },
    { id: "appearance", label: "Appearance", icon: <Palette className="h-4 w-4" /> },
    { id: "ai", label: "AI", icon: <Bot className="h-4 w-4" /> },
    { id: "about", label: "About", icon: <Info className="h-4 w-4" /> },
  ];

  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "dev";

  return (
    <div
      className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-popover rounded-sm shadow-lg max-w-lg w-full mx-4 max-h-[85vh] flex flex-col modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-parchment">
          <h2 className="font-display text-lg text-ink">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate hover:text-ink transition-colors"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-parchment px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 font-sans text-body-sm transition-colors relative",
                activeTab === tab.id
                  ? "text-burgundy"
                  : "text-slate-muted hover:text-ink"
              )}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-burgundy" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "code" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-caption text-ink mb-1">Default Programming Language</h3>
                <p className="font-sans text-[10px] text-slate-muted mb-3">
                  Set your preferred programming language. This will be used as context for AI responses and can be overridden in each session.
                </p>

                <select
                  value={settings.defaultLanguage}
                  onChange={(e) => setDefaultLanguage(e.target.value as ProgrammingLanguageId)}
                  className="w-full px-3 py-2 font-sans text-caption text-foreground bg-card border border-parchment-dark rounded-sm focus:outline-none focus:ring-1 focus:ring-burgundy focus:border-burgundy transition-colors"
                >
                  {PROGRAMMING_LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.name} {lang.description !== lang.name && `- ${lang.description}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-parchment">
                <p className="font-sans text-[10px] text-slate-muted italic">
                  More code preferences (syntax highlighting theme, tab size) coming soon.
                </p>
              </div>
            </div>
          )}

          {activeTab === "ai" && <AIProviderSettings />}

          {activeTab === "appearance" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-caption text-ink mb-1">Font Sizes</h3>
                <p className="font-sans text-[10px] text-slate-muted mb-3">
                  Set default font sizes. These can be adjusted per-mode using the controls in each view.
                </p>

                {/* Code Font Size */}
                <div className="flex items-center justify-between py-2 border-b border-parchment">
                  <div>
                    <label className="block font-sans text-caption font-medium text-ink">
                      Code Font Size
                    </label>
                    <p className="font-sans text-[10px] text-slate-muted">
                      Default size for code editor
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setGlobalCodeFontSize(settings.codeFontSize - 1)}
                      disabled={settings.codeFontSize <= FONT_SIZE_MIN}
                      className={cn(
                        "p-1 rounded-sm border border-parchment-dark transition-colors",
                        settings.codeFontSize <= FONT_SIZE_MIN
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:border-burgundy hover:text-burgundy"
                      )}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-7 text-center font-mono text-caption">
                      {settings.codeFontSize}
                    </span>
                    <button
                      onClick={() => setGlobalCodeFontSize(settings.codeFontSize + 1)}
                      disabled={settings.codeFontSize >= FONT_SIZE_MAX}
                      className={cn(
                        "p-1 rounded-sm border border-parchment-dark transition-colors",
                        settings.codeFontSize >= FONT_SIZE_MAX
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:border-burgundy hover:text-burgundy"
                      )}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Chat Font Size */}
                <div className="flex items-center justify-between py-2 border-b border-parchment">
                  <div>
                    <label className="block font-sans text-caption font-medium text-ink">
                      Chat Font Size
                    </label>
                    <p className="font-sans text-[10px] text-slate-muted">
                      Default size for conversation text
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setGlobalChatFontSize(settings.chatFontSize - 1)}
                      disabled={settings.chatFontSize <= FONT_SIZE_MIN}
                      className={cn(
                        "p-1 rounded-sm border border-parchment-dark transition-colors",
                        settings.chatFontSize <= FONT_SIZE_MIN
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:border-burgundy hover:text-burgundy"
                      )}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-7 text-center font-mono text-caption">
                      {settings.chatFontSize}
                    </span>
                    <button
                      onClick={() => setGlobalChatFontSize(settings.chatFontSize + 1)}
                      disabled={settings.chatFontSize >= FONT_SIZE_MAX}
                      className={cn(
                        "p-1 rounded-sm border border-parchment-dark transition-colors",
                        settings.chatFontSize >= FONT_SIZE_MAX
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:border-burgundy hover:text-burgundy"
                      )}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* UI Font Size */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <label className="block font-sans text-caption font-medium text-ink">
                      UI Font Size
                    </label>
                    <p className="font-sans text-[10px] text-slate-muted">
                      Size for modals, settings, and windows
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setUiFontSize(settings.uiFontSize - 1)}
                      disabled={settings.uiFontSize <= UI_FONT_SIZE_MIN}
                      className={cn(
                        "p-1 rounded-sm border border-parchment-dark transition-colors",
                        settings.uiFontSize <= UI_FONT_SIZE_MIN
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:border-burgundy hover:text-burgundy"
                      )}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-7 text-center font-mono text-caption">
                      {settings.uiFontSize}
                    </span>
                    <button
                      onClick={() => setUiFontSize(settings.uiFontSize + 1)}
                      disabled={settings.uiFontSize >= UI_FONT_SIZE_MAX}
                      className={cn(
                        "p-1 rounded-sm border border-parchment-dark transition-colors",
                        settings.uiFontSize >= UI_FONT_SIZE_MAX
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:border-burgundy hover:text-burgundy"
                      )}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Theme Selection */}
              <div className="pt-3 border-t border-parchment">
                <h3 className="font-display text-caption text-ink mb-1">Theme</h3>
                <p className="font-sans text-[10px] text-slate-muted mb-3">
                  Choose your preferred colour scheme.
                </p>

                <div className="flex gap-2">
                  {([
                    { id: "light", label: "Light", icon: Sun },
                    { id: "dark", label: "Dark", icon: Moon },
                    { id: "system", label: "System", icon: Monitor },
                  ] as const).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setTheme(id)}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1.5 p-3 rounded-sm border transition-colors",
                        settings.theme === id
                          ? "border-burgundy bg-burgundy/5 text-burgundy"
                          : "border-parchment-dark hover:border-slate-muted text-slate"
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.5} />
                      <span className="font-sans text-[10px]">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "about" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-sm text-ink mb-1.5">
                  Critical Code Studies Workbench
                </h3>
                <p className="font-sans text-caption text-slate mb-3">
                  A web application for close reading and hermeneutic analysis of software as cultural artefact.
                </p>
                <div className="bg-cream rounded-sm p-3 space-y-1.5">
                  <div className="flex justify-between font-sans text-caption">
                    <span className="text-slate-muted">Version</span>
                    <span className="text-ink font-mono">{appVersion}</span>
                  </div>
                  <div className="flex justify-between font-sans text-caption">
                    <span className="text-slate-muted">Methodology</span>
                    <span className="text-ink">CCS v2.5</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-display text-caption text-ink mb-1.5">Acknowledgments</h4>
                <ul className="font-sans text-[10px] text-slate-muted space-y-0.5">
                  <li>Critical code studies methodology inspired by Mark Marino, David M. Berry, and the CCS community</li>
                  <li>Built with Next.js and Tailwind CSS</li>
                  <li>Developed with Claude Code (Anthropic)</li>
                  <li>Co-created at CCSWG 2026</li>
                </ul>
              </div>

              <div>
                <h4 className="font-display text-caption text-ink mb-1.5">Links</h4>
                <div className="space-y-1.5">
                  <a
                    href="https://github.com/dmberry/CCS-WB"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block font-sans text-caption text-burgundy hover:text-burgundy-dark transition-colors"
                  >
                    GitHub Repository →
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-parchment">
          <button
            onClick={onClose}
            className="w-full px-3 py-2 font-sans text-caption text-slate hover:text-ink hover:bg-cream rounded-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
