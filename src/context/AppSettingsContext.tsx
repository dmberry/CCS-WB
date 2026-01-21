"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type {
  AppSettings,
  AppSettingsStorage,
  AppMode,
  FontSizeSettings,
  ProgrammingLanguageId,
  ThemeMode,
  AccentColourId,
} from "@/types/app-settings";
import {
  DEFAULT_APP_SETTINGS,
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
  UI_FONT_SIZE_MIN,
  UI_FONT_SIZE_MAX,
  ACCENT_COLOURS,
} from "@/types/app-settings";

const STORAGE_KEY = "ccs-wb-app-settings";
const STORAGE_VERSION = "1.0";

interface AppSettingsContextValue {
  settings: AppSettings;
  isLoaded: boolean;

  // Get effective font sizes for a mode (considers overrides)
  getFontSizes: (mode: AppMode) => FontSizeSettings;

  // Update global defaults (clears all mode overrides)
  setGlobalCodeFontSize: (size: number) => void;
  setGlobalChatFontSize: (size: number) => void;

  // Update mode-specific override
  setModeCodeFontSize: (mode: AppMode, size: number) => void;
  setModeChatFontSize: (mode: AppMode, size: number) => void;

  // Reset mode to use global defaults
  resetModeToGlobal: (mode: AppMode) => void;

  // Set default programming language
  setDefaultLanguage: (language: ProgrammingLanguageId) => void;

  // Set UI font size for modals and windows
  setUiFontSize: (size: number) => void;

  // Set theme
  setTheme: (theme: ThemeMode) => void;

  // Get effective theme (resolves "system" to actual theme)
  effectiveTheme: "light" | "dark";

  // Set accent colour
  setAccentColour: (colour: AccentColourId) => void;

  // Clear all settings
  clearSettings: () => void;
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

export function AppSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");

  // Detect system theme preference
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemTheme(mediaQuery.matches ? "dark" : "light");

    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: AppSettingsStorage = JSON.parse(stored);
        if (parsed.version === STORAGE_VERSION && parsed.settings) {
          // Migrate old settings that don't have defaultLanguage, uiFontSize, theme, or accentColour
          const migratedSettings: AppSettings = {
            ...parsed.settings,
            defaultLanguage: parsed.settings.defaultLanguage ?? "",
            uiFontSize: parsed.settings.uiFontSize ?? DEFAULT_APP_SETTINGS.uiFontSize,
            theme: parsed.settings.theme ?? DEFAULT_APP_SETTINGS.theme,
            accentColour: parsed.settings.accentColour ?? DEFAULT_APP_SETTINGS.accentColour,
          };
          setSettings(migratedSettings);
        }
      }
    } catch (e) {
      console.error("Failed to load app settings:", e);
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage on change
  useEffect(() => {
    if (isLoaded) {
      try {
        const storage: AppSettingsStorage = {
          version: STORAGE_VERSION,
          settings,
          lastUpdated: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
      } catch (e) {
        console.error("Failed to save app settings:", e);
      }
    }
  }, [settings, isLoaded]);

  // Get effective font sizes for a mode
  const getFontSizes = useCallback(
    (mode: AppMode): FontSizeSettings => {
      const modeOverride = settings.modeOverrides[mode];
      return {
        codeFontSize: modeOverride?.codeFontSize ?? settings.codeFontSize,
        chatFontSize: modeOverride?.chatFontSize ?? settings.chatFontSize,
      };
    },
    [settings]
  );

  // Clamp font size to valid range
  const clampFontSize = (size: number): number => {
    return Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, size));
  };

  // Update global code font size (clears all mode overrides for code font)
  const setGlobalCodeFontSize = useCallback((size: number) => {
    const clamped = clampFontSize(size);
    setSettings((prev) => {
      // Clear code font overrides from all modes
      const newOverrides = { ...prev.modeOverrides };
      Object.keys(newOverrides).forEach((mode) => {
        const modeKey = mode as AppMode;
        if (newOverrides[modeKey]) {
          const { codeFontSize: _, ...rest } = newOverrides[modeKey]!;
          if (Object.keys(rest).length === 0) {
            delete newOverrides[modeKey];
          } else {
            newOverrides[modeKey] = rest;
          }
        }
      });
      return {
        ...prev,
        codeFontSize: clamped,
        modeOverrides: newOverrides,
      };
    });
  }, []);

  // Update global chat font size (clears all mode overrides for chat font)
  const setGlobalChatFontSize = useCallback((size: number) => {
    const clamped = clampFontSize(size);
    setSettings((prev) => {
      // Clear chat font overrides from all modes
      const newOverrides = { ...prev.modeOverrides };
      Object.keys(newOverrides).forEach((mode) => {
        const modeKey = mode as AppMode;
        if (newOverrides[modeKey]) {
          const { chatFontSize: _, ...rest } = newOverrides[modeKey]!;
          if (Object.keys(rest).length === 0) {
            delete newOverrides[modeKey];
          } else {
            newOverrides[modeKey] = rest;
          }
        }
      });
      return {
        ...prev,
        chatFontSize: clamped,
        modeOverrides: newOverrides,
      };
    });
  }, []);

  // Update mode-specific code font size
  const setModeCodeFontSize = useCallback((mode: AppMode, size: number) => {
    const clamped = clampFontSize(size);
    setSettings((prev) => ({
      ...prev,
      modeOverrides: {
        ...prev.modeOverrides,
        [mode]: {
          ...prev.modeOverrides[mode],
          codeFontSize: clamped,
        },
      },
    }));
  }, []);

  // Update mode-specific chat font size
  const setModeChatFontSize = useCallback((mode: AppMode, size: number) => {
    const clamped = clampFontSize(size);
    setSettings((prev) => ({
      ...prev,
      modeOverrides: {
        ...prev.modeOverrides,
        [mode]: {
          ...prev.modeOverrides[mode],
          chatFontSize: clamped,
        },
      },
    }));
  }, []);

  // Reset a mode to use global defaults
  const resetModeToGlobal = useCallback((mode: AppMode) => {
    setSettings((prev) => {
      const newOverrides = { ...prev.modeOverrides };
      delete newOverrides[mode];
      return {
        ...prev,
        modeOverrides: newOverrides,
      };
    });
  }, []);

  // Set default programming language
  const setDefaultLanguage = useCallback((language: ProgrammingLanguageId) => {
    setSettings((prev) => ({
      ...prev,
      defaultLanguage: language,
    }));
  }, []);

  // Set UI font size for modals and windows
  const setUiFontSize = useCallback((size: number) => {
    const clamped = Math.max(UI_FONT_SIZE_MIN, Math.min(UI_FONT_SIZE_MAX, size));
    setSettings((prev) => ({
      ...prev,
      uiFontSize: clamped,
    }));
  }, []);

  // Set theme
  const setTheme = useCallback((theme: ThemeMode) => {
    setSettings((prev) => ({
      ...prev,
      theme,
    }));
  }, []);

  // Set accent colour
  const setAccentColour = useCallback((colour: AccentColourId) => {
    setSettings((prev) => ({
      ...prev,
      accentColour: colour,
    }));
  }, []);

  // Calculate effective theme (resolves "system" to actual theme)
  const effectiveTheme: "light" | "dark" =
    settings.theme === "system" ? systemTheme : settings.theme;

  // Apply theme class to document
  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    if (effectiveTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [effectiveTheme]);

  // Apply UI font size as CSS variable
  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    root.style.setProperty("--ui-font-size", `${settings.uiFontSize}px`);
  }, [settings.uiFontSize]);

  // Apply accent colour and themed backgrounds as CSS variables
  useEffect(() => {
    if (typeof document === "undefined") return;

    const colourDef = ACCENT_COLOURS.find(c => c.id === settings.accentColour);
    if (!colourDef) return;

    const root = document.documentElement;
    const isDark = effectiveTheme === "dark";

    // Set accent colour
    root.style.setProperty("--burgundy", isDark ? colourDef.hsl.dark : colourDef.hsl.light);

    // Set themed background colours
    root.style.setProperty("--background", isDark ? colourDef.bg.dark : colourDef.bg.light);
    root.style.setProperty("--ivory", isDark ? colourDef.bg.dark : colourDef.bg.light);
    root.style.setProperty("--cream", isDark ? colourDef.cream.dark : colourDef.cream.light);
    root.style.setProperty("--muted", isDark ? colourDef.cream.dark : colourDef.cream.light);
    root.style.setProperty("--parchment", isDark ? colourDef.parchment.dark : colourDef.parchment.light);

    // Also update primary to match accent
    root.style.setProperty("--primary", isDark ? colourDef.hsl.dark : colourDef.hsl.light);
    root.style.setProperty("--ring", isDark ? colourDef.hsl.dark : colourDef.hsl.light);
  }, [settings.accentColour, effectiveTheme]);

  // Clear all settings
  const clearSettings = useCallback(() => {
    setSettings(DEFAULT_APP_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AppSettingsContext.Provider
      value={{
        settings,
        isLoaded,
        getFontSizes,
        setGlobalCodeFontSize,
        setGlobalChatFontSize,
        setModeCodeFontSize,
        setModeChatFontSize,
        resetModeToGlobal,
        setDefaultLanguage,
        setUiFontSize,
        setTheme,
        effectiveTheme,
        setAccentColour,
        clearSettings,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error("useAppSettings must be used within an AppSettingsProvider");
  }
  return context;
}
